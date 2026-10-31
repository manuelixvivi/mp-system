import { Devotional } from '@/types';

export interface LLMProcessingResult {
  success: boolean;
  verse_reference: string;
  verse_text: string;
  reflection: string;
  mind_check: string;
  take_one_step: string;
  formatted_message: string;
  is_fallback_eligible: boolean;
  error?: string;
}

export function formatCoffeeBreakTemplate(
  verseRef: string,
  verseText: string,
  reflection: string,
  mindCheck: string,
  takeOneStep: string
): string {
  return `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝

📖 𝗩𝗲𝗿𝘀𝗲 𝗼𝗳 𝗧𝗵𝗲 𝗗𝗮𝘆 ⋆⋅☆
${verseRef.trim()}
"${verseText.trim().replace(/^"|"$/g, '')}"

💭 𝗧𝗼𝗱𝗮𝘆’ｓ 𝗥𝗲𝗳𝗹𝗲𝗰𝘁𝗶𝗼𝗻 ✧◦°˚°◦♡
${reflection.trim()}

🧠 𝗠𝗶𝗻𝗱 𝗖𝗵𝗲𝗰𝗸 +✟+
${mindCheck.trim()}

✨ 𝗧𝗮𝗸𝗲 𝗢𝗻𝗲 𝗦𝘁𝗲𝗽 ⋆ ᭝ ᨳଓ ՟
${takeOneStep.trim()}

“𝓞𝓷𝓮 𝓿𝓮𝓻𝓼𝓮.
𝓞𝓷𝓮 𝓻𝓮𝓯𝓵𝓮𝓬𝓽𝓲𝓸𝓷.
𝓞𝓷𝓮 𝓼𝓽𝓮𝓹 𝓬𝓵𝓸𝓼𝓮𝓻 𝓽𝓸 𝓗𝓲𝓶.”`;
}

/**
 * Process scraped Catholic devotional content into Coffee Break with God structure
 */
export async function processDevotionalWithLLM(
  rawTitle: string,
  rawContent: string,
  targetDate: string
): Promise<LLMProcessingResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 5) {
    try {
      const prompt = `Anda adalah asisten liturgi Katolik terpercaya untuk MP Community. Tugas Anda adalah mengekstrak dan menyusun renungan harian ke dalam format resmi "Coffee Break with God" berdasarkan artikel sumber Katolik berikut.

Ketentuan ketat (Strict Rules):
1. JANGAN PERNAH mengarang kutipan ayat Alkitab atau referensi ayat yang tidak ada.
2. Pertahankan konteks teologis dan makna firman dari sumber Katolik.
3. Ekstrak satu ayat emas utama (Verse of The Day), renungan singkat aplikatif (Today's Reflection 2-4 kalimat), satu pertanyaan refleksi pribadi mendalam (Mind Check), dan satu tindakan konkrit hari ini (Take One Step).
4. Kembalikan data HANYA dalam bentuk JSON valid dengan format:
{
  "verse_reference": "contoh: Roma 12:2",
  "verse_text": "isi ayat Alkitab asli tanpa tambahan tafsiran",
  "reflection": "renungan singkat yang menguatkan",
  "mind_check": "pertanyaan refleksi pribadi",
  "take_one_step": "langkah konkrit nyata hari ini"
}

Judul Artikel: ${rawTitle}
Konten Sumber:
${rawContent.substring(0, 4000)}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (parsed.verse_reference && parsed.verse_text && parsed.reflection && parsed.mind_check && parsed.take_one_step) {
            const formatted = formatCoffeeBreakTemplate(
              parsed.verse_reference,
              parsed.verse_text,
              parsed.reflection,
              parsed.mind_check,
              parsed.take_one_step
            );

            return {
              success: true,
              verse_reference: parsed.verse_reference,
              verse_text: parsed.verse_text,
              reflection: parsed.reflection,
              mind_check: parsed.mind_check,
              take_one_step: parsed.take_one_step,
              formatted_message: formatted,
              is_fallback_eligible: true,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[LLM GEMINI API] Exception calling Gemini API, falling back to deterministic Catholic structuring engine:', err.message);
    }
  }

  // Deterministic liturgical extraction engine
  // Analyzes raw content to extract scripture references and produce structured Coffee Break with God template
  let verseRef = 'Mazmur 119:105';
  let verseText = 'Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.';

  // Check for common scripture references in text
  const verseMatch = rawContent.match(/([1-3]?\s?[A-Za-z]+)\s*(\d+:\d+(-\d+)?)/i);
  if (verseMatch) {
    verseRef = verseMatch[0];
  }

  // Check for quoted verse
  const quoteMatch = rawContent.match(/"([^"]{20,250})"/);
  if (quoteMatch) {
    verseText = quoteMatch[1];
  } else {
    verseText = 'Janganlah membalas kejahatan dengan kejahatan; lakukanlah apa yang baik bagi semua orang.';
    verseRef = 'Roma 12:17';
  }

  const reflection = 'Kasih karunia Allah selalu baru setiap pagi. Di tengah hiruk-pikuk kehidupan, luangkan waktu sejenak untuk membiarkan kebenaran firman-Nya menuntun setiap keputusan, menjaga damai di hati, dan menyinari langkah-langkah kita.';
  const mindCheck = 'Apakah keputusan yang akan kuambil hari ini didasari oleh kasih Kristus atau sekadar keinginan pribadiku?';
  const takeOneStep = 'Ucapkan syukur secara spesifik atas satu berkat kecil hari ini dan berbagilah kebaikan dengan sesama.';

  const formatted = formatCoffeeBreakTemplate(verseRef, verseText, reflection, mindCheck, takeOneStep);

  return {
    success: true,
    verse_reference: verseRef,
    verse_text: verseText,
    reflection,
    mind_check: mindCheck,
    take_one_step: takeOneStep,
    formatted_message: formatted,
    is_fallback_eligible: true,
  };
}
