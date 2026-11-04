import { randomUUID } from 'crypto';
import {
  getDevotionals,
  getDevotionalByDate,
  saveDevotional,
  saveDevotionalSource,
  getMembers,
  getLineGroups,
  getAutomationSettings,
  addDelivery,
  addActivityLog,
  addNotification,
} from '../db/store';
import { scrapeTheKatolikDevotional, getAvailableTheKatolikEntries } from '../scraper/the-katolik';
import { processDevotionalWithLLM } from '../llm/gemini';
import { LineApiClient } from '../line/client';
import { getWibParts, getWibIsoDate } from '../time';

export interface JobExecutionResult {
  job: string;
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 1. SCRAPING JOB: 00:00 WIB
 */
export async function runDevotionalScrapeJob(
  targetDate: Date = new Date(),
  force: boolean = false
): Promise<JobExecutionResult> {
  const dateIso = getWibIsoDate(targetDate);
  const settings = await getAutomationSettings();

  if (!settings.devotional_automation_active) {
    return { job: 'devotional_scrape', success: false, message: 'Devotional automation is disabled in settings.' };
  }

  // PRD & Policy: Sehari hanya boleh melakukan scraping sekali
  const existingDevotional = await getDevotionalByDate(dateIso);
  if (existingDevotional && !force) {
    console.log(`[SCRAPER POLICY] Scraping untuk tanggal ${dateIso} sudah pernah dilakukan hari ini.`);
    return {
      job: 'devotional_scrape',
      success: false,
      message: `Scraping untuk tanggal ${dateIso} sudah pernah dilakukan hari ini. Sistem membatasi scraping hanya satu kali dalam sehari.`,
      details: {
        devotional_id: existingDevotional.id,
        date: dateIso,
        already_scraped: true,
      },
    };
  }

  try {
    // 1. Scrape source
    const scrapeResult = await scrapeTheKatolikDevotional(targetDate);

    // Save source
    saveDevotionalSource({
      id: `src_${dateIso}`,
      target_date: dateIso,
      source_url: scrapeResult.sourceUrl,
      raw_title: scrapeResult.rawTitle,
      raw_content: scrapeResult.rawContent,
      scraping_status: scrapeResult.success ? 'success' : 'failed',
      error_details: scrapeResult.error,
      scraped_at: new Date().toISOString(),
    });

    if (!scrapeResult.success || !scrapeResult.rawContent) {
      addNotification({
        recipient_role: 'superadmin',
        title: 'Scraping Renungan Gagal',
        message: `Gagal mengambil artikel renungan The Katolik untuk tanggal ${dateIso}: ${scrapeResult.error}`,
        type: 'error',
      });

      addActivityLog({
        actor_type: 'system_scheduler',
        action: 'devotional_scrape_failed',
        entity_type: 'devotional',
        entity_id: dateIso,
        details: { error: scrapeResult.error },
      });

      return { job: 'devotional_scrape', success: false, message: 'Scraping failed', details: scrapeResult.error };
    }

    // 2. Process with LLM
    const llmResult = await processDevotionalWithLLM(
      scrapeResult.rawTitle || '',
      scrapeResult.rawContent,
      dateIso
    );

    // 3. Save structured devotional
    const devotionalId = existingDevotional?.id || randomUUID();

    await saveDevotional({
      id: devotionalId,
      devotional_date: dateIso,
      source_id: `src_${dateIso}`,
      saint_commemoration: llmResult.saint_commemoration,
      verse_reference: llmResult.verse_reference,
      verse_text: llmResult.verse_text,
      reflection: llmResult.reflection,
      mind_check: llmResult.mind_check,
      take_one_step: llmResult.take_one_step,
      formatted_message: llmResult.formatted_message,
      audit_status: existingDevotional?.audit_status || 'pending',
      is_fallback_eligible: llmResult.is_fallback_eligible,
      created_at: existingDevotional?.created_at || new Date().toISOString(),
    });

    // Notify Liturgi team for audit
    addNotification({
      recipient_role: 'liturgi',
      title: 'Renungan Siap Diaudit',
      message: `Renungan Coffee Break with God (${dateIso}) selesai diproses. Harap diaudit sebelum 09:45 WIB.`,
      type: 'info',
    });

    addActivityLog({
      actor_type: 'system_scheduler',
      action: 'devotional_scraped_and_processed',
      entity_type: 'devotional',
      entity_id: devotionalId,
      details: { verse: llmResult.verse_reference },
    });

    return {
      job: 'devotional_scrape',
      success: true,
      message: `Devotional for ${dateIso} scraped and formatted successfully.`,
      details: { id: devotionalId, verse: llmResult.verse_reference },
    };
  } catch (err: any) {
    return { job: 'devotional_scrape', success: false, message: err.message };
  }
}

export interface MultiDayScrapeResult {
  job: string;
  success: boolean;
  message: string;
  scrapedDates: string[];
  skippedDates: string[];
  failedDates: string[];
  totalAvailable: number;
}

/**
 * 1b. MULTI-DAY SCRAPING JOB:
 * Scrapes today and all upcoming published devotional dates available on The Katolik
 */
export async function runMultiDayDevotionalScrapeJob(
  baseDate: Date = new Date(),
  force: boolean = false
): Promise<MultiDayScrapeResult> {
  const settings = await getAutomationSettings();
  if (!settings.devotional_automation_active) {
    return {
      job: 'devotional_scrape_multiday',
      success: false,
      message: 'Otomatisasi renungan sedang dinonaktifkan di pengaturan sistem.',
      scrapedDates: [],
      skippedDates: [],
      failedDates: [],
      totalAvailable: 0,
    };
  }

  const baseIso = getWibIsoDate(baseDate);
  const availableEntries = await getAvailableTheKatolikEntries();

  // Filter entries from base date onwards
  const futureEntries = availableEntries.filter((e) => e.isoDate >= baseIso);

  const scrapedDates: string[] = [];
  const skippedDates: string[] = [];
  const failedDates: string[] = [];

  // Fallback if no future entries in Blogger feed
  if (futureEntries.length === 0) {
    const single = await runDevotionalScrapeJob(baseDate, force);
    if (single.success) {
      scrapedDates.push(baseIso);
    } else if (single.details?.already_scraped) {
      skippedDates.push(baseIso);
    } else {
      failedDates.push(baseIso);
    }
  } else {
    for (const entry of futureEntries) {
      const existing = await getDevotionalByDate(entry.isoDate);
      if (existing && !force) {
        skippedDates.push(entry.isoDate);
        continue;
      }

      try {
        const targetDateObj = new Date(entry.isoDate + 'T00:00:00Z');
        const scrapeResult = await scrapeTheKatolikDevotional(targetDateObj, entry.url, entry.title);

        if (!scrapeResult.success || !scrapeResult.rawContent) {
          failedDates.push(entry.isoDate);
          continue;
        }

        saveDevotionalSource({
          id: `src_${entry.isoDate}`,
          target_date: entry.isoDate,
          source_url: scrapeResult.sourceUrl,
          raw_title: scrapeResult.rawTitle,
          raw_content: scrapeResult.rawContent,
          scraping_status: 'success',
          scraped_at: new Date().toISOString(),
        });

        const llmResult = await processDevotionalWithLLM(
          scrapeResult.rawTitle || '',
          scrapeResult.rawContent,
          entry.isoDate
        );

        const devotionalId = existing?.id || randomUUID();
        await saveDevotional({
          id: devotionalId,
          devotional_date: entry.isoDate,
          source_id: `src_${entry.isoDate}`,
          saint_commemoration: llmResult.saint_commemoration,
          verse_reference: llmResult.verse_reference,
          verse_text: llmResult.verse_text,
          reflection: llmResult.reflection,
          mind_check: llmResult.mind_check,
          take_one_step: llmResult.take_one_step,
          formatted_message: llmResult.formatted_message,
          audit_status: existing?.audit_status || 'pending',
          is_fallback_eligible: llmResult.is_fallback_eligible,
          created_at: existing?.created_at || new Date().toISOString(),
        });

        addActivityLog({
          actor_type: 'system_scheduler',
          action: 'devotional_scraped_and_processed',
          entity_type: 'devotional',
          entity_id: devotionalId,
          details: { verse: llmResult.verse_reference, date: entry.isoDate },
        });

        scrapedDates.push(entry.isoDate);
      } catch (err: any) {
        console.error(`[MULTI-DAY SCRAPE] Error processing ${entry.isoDate}:`, err.message);
        failedDates.push(entry.isoDate);
      }
    }
  }

  const totalProcessed = scrapedDates.length;
  let message = '';
  if (totalProcessed > 0) {
    message = `Multi-day scraping berhasil! ${totalProcessed} renungan berhasil discrape dan masuk ke kalender (${scrapedDates.join(', ')}).`;
    if (skippedDates.length > 0) {
      message += ` (${skippedDates.length} hari sudah tersedia sebelumnya).`;
    }
  } else if (skippedDates.length > 0) {
    message = `Seluruh renungan (${skippedDates.length} hari ke depan: ${skippedDates[0]} s/d ${skippedDates[skippedDates.length - 1]}) sudah lengkap dan tersimpan di kalender.`;
  } else {
    message = `Tidak ada renungan baru yang berhasil discrape.`;
  }

  return {
    job: 'devotional_scrape_multiday',
    success: totalProcessed > 0 || skippedDates.length > 0,
    message,
    scrapedDates,
    skippedDates,
    failedDates,
    totalAvailable: futureEntries.length,
  };
}

/**
 * 2. BROADCAST DEVOTIONAL JOB: 09:45 WIB (With Audit & Fallback Policy)
 */
export async function runDevotionalBroadcastJob(targetDate: Date = new Date()): Promise<JobExecutionResult> {
  const dateIso = getWibIsoDate(targetDate);
  const settings = await getAutomationSettings();

  if (!settings.devotional_automation_active) {
    return { job: 'devotional_broadcast', success: false, message: 'Devotional automation is disabled in settings.' };
  }

  const devotional = await getDevotionalByDate(dateIso);

  if (!devotional) {
    addNotification({
      recipient_role: 'superadmin',
      title: 'Renungan Tidak Ditemukan',
      message: `Tidak ada data renungan untuk tanggal ${dateIso} pada saat jadwal siaran 09:45 WIB.`,
      type: 'error',
    });
    return { job: 'devotional_broadcast', success: false, message: 'No devotional found for today.' };
  }

  // PRD 4.5: Audit & Fallback Policy Matrix
  let canSend = false;
  let deliveryType: 'scheduled' | 'fallback' = 'scheduled';

  if (devotional.audit_status === 'approved') {
    canSend = true;
    deliveryType = 'scheduled';
  } else if (devotional.audit_status === 'pending') {
    // Check fallback eligibility
    if (settings.devotional_fallback_enabled && devotional.is_fallback_eligible && devotional.formatted_message) {
      canSend = true;
      deliveryType = 'fallback';
      console.log(`[DEVOTIONAL BROADCAST] Triggering automatic fallback for pending devotional (${dateIso})`);
    } else {
      canSend = false;
      addNotification({
        recipient_role: 'superadmin',
        title: 'Renungan Pending Tidak Memenuhi Syarat Fallback',
        message: `Renungan hari ini berstatus pending dan tidak lolos validasi fallback. Siaran 09:45 WIB dibatalkan.`,
        type: 'warning',
      });
      return { job: 'devotional_broadcast', success: false, message: 'Pending devotional not eligible for fallback.' };
    }
  } else if (devotional.audit_status === 'revision_required') {
    return { job: 'devotional_broadcast', success: false, message: 'Devotional status is revision_required. Do not send.' };
  } else if (devotional.audit_status === 'rejected') {
    return { job: 'devotional_broadcast', success: false, message: 'Devotional is rejected. Do not send.' };
  }

  if (!canSend) {
    return { job: 'devotional_broadcast', success: false, message: 'Delivery criteria not met.' };
  }

  // Find target groups
  const allTargetGroups = await getLineGroups();
  const targetGroups = allTargetGroups.filter((g) => g.is_active && g.assigned_modules.includes('devotional'));
  const lineClient = new LineApiClient();
  let deliveredCount = 0;
  const errors: string[] = [];

  for (const group of targetGroups) {
    const idempotencyKey = `devotional_${dateIso}_${group.id}`;
    const payload = LineApiClient.buildDevotionalMessage(devotional.formatted_message);

    const result = await lineClient.pushMessage(group.group_id, [payload]);

    if (result.success) {
      addDelivery({
        module: 'devotional',
        reference_id: devotional.id,
        line_group_id: group.id,
        group_name: group.group_name,
        delivery_type: deliveryType,
        sender_channel: 'system_cron',
        status: 'success',
        idempotency_key: idempotencyKey,
      });
      deliveredCount++;
    } else {
      errors.push(`Group ${group.group_name}: ${result.error}`);
      addDelivery({
        module: 'devotional',
        reference_id: devotional.id,
        line_group_id: group.id,
        group_name: group.group_name,
        delivery_type: deliveryType,
        sender_channel: 'system_cron',
        status: 'failed',
        error_message: result.error,
        idempotency_key: idempotencyKey,
      });
    }
  }

  addActivityLog({
    actor_type: 'system_scheduler',
    action: deliveryType === 'fallback' ? 'devotional_broadcast_fallback_sent' : 'devotional_broadcast_sent',
    entity_type: 'devotional',
    entity_id: devotional.id,
    details: { deliveredTo: deliveredCount, type: deliveryType, errors },
  });

  addNotification({
    recipient_role: 'superadmin',
    title: 'Renungan Berhasil Dikirim',
    message: `Renungan Coffee Break with God berhasil dikirim ke ${deliveredCount} grup LINE (${deliveryType}).`,
    type: 'success',
  });

  return {
    job: 'devotional_broadcast',
    success: deliveredCount > 0,
    message: `Devotional sent to ${deliveredCount} groups (${deliveryType}).`,
    details: { deliveredCount, errors },
  };
}

/**
 * 3. BIRTHDAY BROADCAST JOB: 07:00 WIB
 */
export async function runBirthdayBroadcastJob(targetDate: Date = new Date()): Promise<JobExecutionResult> {
  const { isoDate: dateIso, day, month } = getWibParts(targetDate);
  const settings = await getAutomationSettings();

  if (!settings.birthday_automation_active) {
    return { job: 'birthday_broadcast', success: false, message: 'Birthday automation is disabled in settings.' };
  }

  // 1. Find active members whose birthday is today
  const allMembers = await getMembers();
  const activeMembers = allMembers.filter((m) => m.status === 'active');
  const birthdayMembers = activeMembers.filter((m) => m.birth_date === day && m.birth_month === month);

  if (birthdayMembers.length === 0) {
    console.log(`[BIRTHDAY JOB] No birthdays today (${dateIso}). No messages sent.`);
    return { job: 'birthday_broadcast', success: true, message: 'No birthdays today. Skipped cleanly.' };
  }

  // 2. Group members by their assigned groups
  const allGroups = await getLineGroups();
  const groups = allGroups.filter((g) => g.is_active && g.assigned_modules.includes('birthday'));
  const lineClient = new LineApiClient();
  let totalGroupsBroadcasted = 0;

  for (const group of groups) {
    // Find members belonging to this group
    const membersInGroup = birthdayMembers.filter(
      (m) => m.assigned_groups && m.assigned_groups.includes(group.id)
    );

    if (membersInGroup.length === 0) continue;

    // Check members with valid LINE IDs
    const validMembers = membersInGroup.filter((m) => m.line_user_id && m.line_user_id.trim().length > 0);
    const unverifiedMembers = membersInGroup.filter((m) => !m.line_user_id || m.line_user_id.trim().length === 0);

    if (unverifiedMembers.length > 0) {
      addNotification({
        recipient_role: 'logistik',
        title: 'LINE ID Anggota Ultah Belum Ada',
        message: `${unverifiedMembers.map((m) => m.full_name).join(', ')} belum memiliki LINE User ID. Nama mereka tetap disebut via teks di ucapan ultah.`,
        type: 'info',
      });
    }

    // 3. Build batches for all members in group (valid LINE ID gets blue tag, unlinked gets text mention)
    const batches = LineApiClient.buildBirthdayBatches(membersInGroup);
    const campaignId = `bday_${dateIso}_${group.id}`;

    for (const batch of batches) {
      const result = await lineClient.pushMessage(group.group_id, [batch.messagePayload]);

      addDelivery({
        module: 'birthday',
        reference_id: campaignId,
        line_group_id: group.id,
        group_name: group.group_name,
        delivery_type: 'scheduled',
        sender_channel: 'system_cron',
        status: result.success ? 'success' : 'failed',
        error_message: result.error,
        idempotency_key: `${campaignId}_batch_${batch.batchNumber}`,
      });
    }

    totalGroupsBroadcasted++;
  }

  addActivityLog({
    actor_type: 'system_scheduler',
    action: 'birthday_broadcast_completed',
    entity_type: 'birthday',
    entity_id: dateIso,
    details: { totalMembers: birthdayMembers.length, groupsSent: totalGroupsBroadcasted },
  });

  addNotification({
    recipient_role: 'logistik',
    title: 'Ucapan Ulang Tahun Selesai Dikirim',
    message: `Ucapan ulang tahun untuk ${birthdayMembers.length} anggota berhasil dikirim ke ${totalGroupsBroadcasted} grup LINE.`,
    type: 'success',
  });

  return {
    job: 'birthday_broadcast',
    success: true,
    message: `Birthday broadcasts sent to ${totalGroupsBroadcasted} groups for ${birthdayMembers.length} members.`,
    details: { totalMembers: birthdayMembers.length, groupsSent: totalGroupsBroadcasted },
  };
}
