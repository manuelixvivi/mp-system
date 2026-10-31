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
import { scrapeTheKatolikDevotional } from '../scraper/the-katolik';
import { processDevotionalWithLLM } from '../llm/gemini';
import { LineApiClient } from '../line/client';

export interface JobExecutionResult {
  job: string;
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 1. SCRAPING JOB: 00:00 WIB
 */
export async function runDevotionalScrapeJob(targetDate: Date = new Date()): Promise<JobExecutionResult> {
  const dateIso = targetDate.toISOString().split('T')[0];
  const settings = getAutomationSettings();

  if (!settings.devotional_automation_active) {
    return { job: 'devotional_scrape', success: false, message: 'Devotional automation is disabled in settings.' };
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
    const existingDevotional = getDevotionalByDate(dateIso);
    const devotionalId = existingDevotional?.id || `dev_${dateIso}_${Date.now()}`;

    saveDevotional({
      id: devotionalId,
      devotional_date: dateIso,
      source_id: `src_${dateIso}`,
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

/**
 * 2. BROADCAST DEVOTIONAL JOB: 09:45 WIB (With Audit & Fallback Policy)
 */
export async function runDevotionalBroadcastJob(targetDate: Date = new Date()): Promise<JobExecutionResult> {
  const dateIso = targetDate.toISOString().split('T')[0];
  const settings = getAutomationSettings();

  if (!settings.devotional_automation_active) {
    return { job: 'devotional_broadcast', success: false, message: 'Devotional automation is disabled in settings.' };
  }

  const devotional = getDevotionalByDate(dateIso);

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
  const targetGroups = getLineGroups().filter((g) => g.is_active && g.assigned_modules.includes('devotional'));
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
  const dateIso = targetDate.toISOString().split('T')[0];
  const day = targetDate.getDate();
  const month = targetDate.getMonth() + 1;
  const settings = getAutomationSettings();

  if (!settings.birthday_automation_active) {
    return { job: 'birthday_broadcast', success: false, message: 'Birthday automation is disabled in settings.' };
  }

  // 1. Find active members whose birthday is today
  const activeMembers = getMembers().filter((m) => m.status === 'active');
  const birthdayMembers = activeMembers.filter((m) => m.birth_date === day && m.birth_month === month);

  if (birthdayMembers.length === 0) {
    console.log(`[BIRTHDAY JOB] No birthdays today (${dateIso}). No messages sent.`);
    return { job: 'birthday_broadcast', success: true, message: 'No birthdays today. Skipped cleanly.' };
  }

  // 2. Group members by their assigned groups
  const groups = getLineGroups().filter((g) => g.is_active && g.assigned_modules.includes('birthday'));
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
        message: `${unverifiedMembers.map((m) => m.full_name).join(', ')} belum memiliki LINE User ID yang ditautkan.`,
        type: 'warning',
      });
    }

    if (validMembers.length === 0) {
      console.warn(`[BIRTHDAY JOB] Group ${group.group_name} has birthdays today, but none have valid LINE IDs.`);
      continue;
    }

    // 3. Build batches respecting <= 20 mentions per message (PRD 5.6 & 5.7)
    const batches = LineApiClient.buildBirthdayBatches(validMembers);
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
