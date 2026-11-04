import * as cheerio from 'cheerio';
import { getWibParts } from '../time';

// Month names in Indonesian for URL generation & search matching
const INDONESIAN_MONTHS = [
  'januari',
  'februari',
  'maret',
  'april',
  'mei',
  'juni',
  'juli',
  'agustus',
  'september',
  'oktober',
  'november',
  'desember',
];

export function buildTheKatolikUrl(date: Date): string {
  const { year, month, day } = getWibParts(date);
  const monthNumber = String(month).padStart(2, '0');
  const monthName = INDONESIAN_MONTHS[month - 1];

  // Standard Blogger path: https://www.thekatolik.com/{YYYY}/{MM}/renungan-harian-katolik-{D}-{monthName}-{YYYY}.html
  return `https://www.thekatolik.com/${year}/${monthNumber}/renungan-harian-katolik-${day}-${monthName}-${year}.html`;
}

export interface ScrapedResult {
  success: boolean;
  targetDate: string;
  sourceUrl: string;
  rawTitle?: string;
  rawContent?: string;
  extractedVerse?: string;
  error?: string;
}

/**
 * Scrapes daily Catholic devotional from thekatolik.com using Blogger JSON feed and permalink resolver
 */
export async function scrapeTheKatolikDevotional(targetDate: Date = new Date()): Promise<ScrapedResult> {
  const { year, month, day, isoDate: dateIso } = getWibParts(targetDate);
  const monthName = INDONESIAN_MONTHS[month - 1];

  let resolvedUrl = '';
  let resolvedTitle = '';

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json, text/html, */*',
  };

  // --- STAGE 1: Feed lookup from official Blogger JSON feed ---
  try {
    const feedUrl = `https://www.thekatolik.com/feeds/posts/default/-/Renungan%20harian?alt=json&max-results=35`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const feedRes = await fetch(feedUrl, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    if (feedRes.ok) {
      const feedData = await feedRes.json();
      const entries = feedData.feed?.entry || [];

      // Match entry by day, month name, and year in title (e.g. "4 November 2026")
      const dateSearchRegex = new RegExp(`\\b0?${day}\\s+${monthName}\\s+${year}\\b`, 'i');
      const matchedEntry = entries.find((e: any) => dateSearchRegex.test(e.title?.$t || ''));

      if (matchedEntry) {
        resolvedTitle = matchedEntry.title?.$t?.trim() || '';
        const altLink = matchedEntry.link?.find((l: any) => l.rel === 'alternate');
        if (altLink?.href) {
          resolvedUrl = altLink.href;
        }
      }
    }
  } catch (feedErr: any) {
    console.warn('[SCRAPER] Feed search notice:', feedErr.message);
  }

  // --- STAGE 2: Search feed query if not found in recent 35 entries ---
  if (!resolvedUrl) {
    try {
      const searchUrl = `https://www.thekatolik.com/feeds/posts/default?alt=json&q=${encodeURIComponent(
        `Renungan Harian Katolik ${day} ${monthName} ${year}`
      )}&max-results=5`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const searchRes = await fetch(searchUrl, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeout);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const entries = searchData.feed?.entry || [];
        const dateSearchRegex = new RegExp(`\\b0?${day}\\s+${monthName}\\s+${year}\\b`, 'i');
        const matched = entries.find((e: any) => dateSearchRegex.test(e.title?.$t || ''));

        if (matched) {
          resolvedTitle = matched.title?.$t?.trim() || '';
          const altLink = matched.link?.find((l: any) => l.rel === 'alternate');
          if (altLink?.href) {
            resolvedUrl = altLink.href;
          }
        }
      }
    } catch (searchErr: any) {
      console.warn('[SCRAPER] Search feed notice:', searchErr.message);
    }
  }

  // --- STAGE 3: Direct URL candidate fallback ---
  if (!resolvedUrl) {
    const padMonth = String(month).padStart(2, '0');
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const padPrevMonth = String(prevMonth).padStart(2, '0');

    const candidates = [
      `https://www.thekatolik.com/${year}/${padMonth}/renungan-harian-katolik-${day}-${monthName}-${year}.html`,
      `https://www.thekatolik.com/${prevYear}/${padPrevMonth}/renungan-harian-katolik-${day}-${monthName}-${year}.html`,
      `https://www.thekatolik.com/${prevYear}/${padPrevMonth}/%20renungan-harian-katolik-${day}-${monthName}-${year}.html`,
    ];

    for (const cand of candidates) {
      try {
        const testRes = await fetch(cand, {
          method: 'HEAD',
          headers,
        });
        if (testRes.ok) {
          resolvedUrl = cand;
          break;
        }
      } catch {}
    }
  }

  // Fallback default URL if completely unreachable
  const finalUrl = resolvedUrl || buildTheKatolikUrl(targetDate);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const pageRes = await fetch(finalUrl, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    if (!pageRes.ok) {
      throw new Error(`HTTP ${pageRes.status}: Gagal memuat artikel dari ${finalUrl}`);
    }

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // Extract title
    const rawTitle =
      resolvedTitle ||
      $('h1.entry-title, .entry-title, h1.post-title, article h1').first().text().trim() ||
      `Renungan Harian Katolik ${day} ${monthName} ${year}`;

    // Extract post body with Blogger specific selectors
    const contentContainer = $('#post-body, .entry-text, article, .post-body, .entry-content').first();
    let rawContent = '';

    if (contentContainer.length > 0) {
      // Remove scripts, ads, and unwanted elements
      contentContainer
        .find('script, style, iframe, .ads, .related-posts, #post-pager, .comments-content, #comment-editor, .share-buttons')
        .remove();
      rawContent = contentContainer.text().replace(/\s+/g, ' ').trim();
    } else {
      rawContent = $('body').text().replace(/\s+/g, ' ').substring(0, 5000);
    }

    if (!rawContent || rawContent.length < 50) {
      throw new Error('Konten renungan yang diekstrak terlalu pendek atau kosong.');
    }

    return {
      success: true,
      targetDate: dateIso,
      sourceUrl: finalUrl,
      rawTitle,
      rawContent,
    };
  } catch (err: any) {
    console.error(`[SCRAPER ERROR] Gagal melakukan scraping artikel dari ${finalUrl}: ${err.message}`);
    return {
      success: false,
      targetDate: dateIso,
      sourceUrl: finalUrl,
      error: err.message,
    };
  }
}
