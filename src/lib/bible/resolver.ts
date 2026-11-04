import * as cheerio from 'cheerio';

/**
 * Ensures a Bible verse reference has the canonical "Bdk. " prefix
 * e.g. "Lukas 14:27" -> "Bdk. Lukas 14:27"
 */
export function formatVerseReference(ref: string): string {
  const clean = (ref || '').trim();
  if (!clean) return '';
  const stripped = clean.replace(/^bdk\.?\s*/i, '').trim();
  return `Bdk. ${stripped}`;
}

/**
 * Resolves the exact single Bible verse reference (e.g. "Lukas 14:27" instead of pericope "Lukas 14:25-33")
 * by searching YouVersion Bible Indonesia (bible.com) using the scripture quote text.
 */
export async function resolveExactVerse(
  quoteText: string,
  fallbackReference?: string
): Promise<string> {
  if (!quoteText || quoteText.trim().length < 10) {
    return fallbackReference || '';
  }

  // Clean quote query: remove quotes and excessive punctuation
  const cleanQuery = quoteText
    .replace(/["“”'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // URL: https://www.bible.com/id/search/bible?query=...
  const url = `https://www.bible.com/id/search/bible?query=${encodeURIComponent(cleanQuery)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return fallbackReference || '';
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let resolvedRef: string | null = null;

    // Look for Bible verse link e.g. /id/bible/306/LUK.14.27.TB
    $('a[href*="/bible/"]').each((_: number, el: any) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const href = $(el).attr('href') || '';

      // Match text that contains Chapter:Verse like "Lukas 14:27 (TB)" or "Roma 12:2"
      if (text && href.includes('/bible/') && !text.includes('Baca') && !text.includes('Daftar')) {
        const cleaned = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
        // Check if matches Book Chapter:Verse without range (or single verse)
        if (/\d+:\d+$/.test(cleaned) || /\d+:\d+-\d+$/.test(cleaned)) {
          resolvedRef = cleaned;
          return false; // break loop on first high-confidence match
        }
      }
    });

    if (resolvedRef) {
      return resolvedRef;
    }
  } catch (err: any) {
    console.warn('[BIBLE RESOLVER] Bible.com search notice:', err.message);
  }

  // If query had whole sentence and failed, try first 10 words
  const words = cleanQuery.split(' ');
  if (words.length > 8) {
    try {
      const shortQuery = words.slice(0, 8).join(' ');
      const shortUrl = `https://www.bible.com/id/search/bible?query=${encodeURIComponent(shortQuery)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(shortUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        let resolvedRef: string | null = null;

        $('a[href*="/bible/"]').each((_: number, el: any) => {
          const text = $(el).text().replace(/\s+/g, ' ').trim();
          const href = $(el).attr('href') || '';
          if (text && href.includes('/bible/') && !text.includes('Baca') && !text.includes('Daftar')) {
            const cleaned = text.replace(/\s*\([^)]*\)\s*$/, '').trim();
            if (/\d+:\d+$/.test(cleaned)) {
              resolvedRef = cleaned;
              return false;
            }
          }
        });

        if (resolvedRef) {
          return resolvedRef;
        }
      }
    } catch {}
  }

  // If resolver couldn't find exact verse, return fallback
  return fallbackReference || '';
}
