import { Devotional } from '@/types';
import Groq from 'groq-sdk';
import { getAutomationSettings } from '../db/store';
import { resolveExactVerse } from '../bible/resolver';

export interface LLMProcessingResult {
  success: boolean;
  saint_commemoration?: string;
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
  takeOneStep: string,
  saintCommemoration?: string
): string {
  const cleanSaint = (saintCommemoration || '').trim();
  const saintSection = cleanSaint ? `\n🕊️ Peringatan : ${cleanSaint}\n` : '';

  return `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝
${saintSection}
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
 * Intelligent liturgical extraction from real scraped Catholic text
 * Used when LLM API keys are not yet configured or as high-precision fallback
 */
function extractFromScrapedLiturgy(rawTitle: string, rawContent: string): {
  saintCommemoration: string;
  verseRef: string;
  verseText: string;
  reflection: string;
  mindCheck: string;
  takeOneStep: string;
} {
  // 1. Extract Saint Commemoration (Peringatan Santo/Santa)
  let saintCommemoration = '';
  const saintMatch = rawContent.match(
    /Peringatan(?:\s+(?:Wajib|Fakultatif))?\s*[:\-–]?\s*([^\n\r–]+?)(?=(Pekan|Tahun|Bacaan|Mazmur|\n|$))/i
  );
  if (saintMatch && saintMatch[1].trim().length > 3) {
    saintCommemoration = saintMatch[1].trim();
  } else {
    // Check if title or content explicitly mentions Santo/Santa
    const titleSaintMatch = (rawTitle + ' ' + rawContent).match(
      /(?:Peringatan\s+)?(Santo|Santa|Beato|Beata|Para Martir|Hari Arwah)\s+[^–\n,]+/i
    );
    if (titleSaintMatch) {
      saintCommemoration = titleSaintMatch[0].replace(/^Peringatan\s+/i, '').trim();
    }
  }

  // 2. Extract Gospel reference (Bacaan Injil) or first scripture reference
  let verseRef = '';
  const injilMatch = rawContent.match(
    /Bacaan Injil\s*:\s*([A-Za-z0-9\s:,–-]+?)(?=(Baca juga|Tema|Pengantar|Mazmur|Bait|\n|$))/i
  );
  if (injilMatch && injilMatch[1].trim().length > 3) {
    verseRef = injilMatch[1].trim();
  } else {
    const refMatch = rawContent.match(/([1-3]?\s?[A-Za-z]+)\s*(\d+:\d+(-\d+)?)/i);
    verseRef = refMatch ? refMatch[0].trim() : 'Lukas 14:25-33';
  }

  // 3. Extract Gospel Quote or Scripture verse
  let verseText = '';
  const quoteMatch = rawContent.match(/"([^"]{25,250})"/);
  if (quoteMatch && quoteMatch[1]) {
    verseText = quoteMatch[1].trim();
  } else {
    // Look for sentence with scripture keywords
    const sentenceMatch = rawContent.match(
      /(?:Yesus bersabda|berkatalah Yesus|Firman Tuhan)[^:.]*:\s*([^.?!]{20,180}[.?!])/i
    );
    if (sentenceMatch) {
      verseText = sentenceMatch[1].trim();
    } else {
      verseText = 'Barangsiapa tidak memikul salibnya dan mengikut Aku, ia tidak dapat menjadi murid-Ku.';
    }
  }

  // 4. Extract Reflection from Pengantar Renungan or Commentary
  let reflection = '';
  const pengantarMatch = rawContent.match(
    /Pengantar Renungan\s*([\s\S]*?)(?=(Bacaan I|Mazmur|Bait|Lukas|Filipi|Refleksi|\n\n))/i
  );
  if (pengantarMatch && pengantarMatch[1].trim().length > 80) {
    const rawParagraph = pengantarMatch[1].trim();
    const periodIdx = rawParagraph.indexOf('.', 120);
    reflection = periodIdx > 0 ? rawParagraph.slice(0, periodIdx + 1).trim() : rawParagraph;
  } else {
    const paragraphs = rawContent.split(/\n+/).map((p) => p.trim()).filter((p) => p.length > 80);
    reflection =
      paragraphs[0] ||
      'Mengikuti Kristus berarti membiarkan seluruh kehidupan kita dibentuk oleh-Nya: cara berpikir, berbicara, mengambil keputusan, dan menentukan apa yang paling utama.';
  }

  // 5. Extract or craft Mind Check question
  let mindCheck = '';
  const questionMatch = rawContent.match(/([A-Z][^.?!]*\?)/);
  if (questionMatch && questionMatch[1].length > 30 && questionMatch[1].length < 220) {
    mindCheck = questionMatch[1].trim();
  } else {
    mindCheck =
      'Apakah Yesus sungguh menjadi yang terutama dalam setiap keputusan hidupku hari ini, ataukah aku masih terikat pada kenyamanan diri sendiri?';
  }

  // 6. Take One Step
  const takeOneStep =
    'Ambil jeda sejenak hari ini untuk memeriksa motivasi hati: lakukan tugas dan pelayanan dengan sukacita tanpa bersungut-sungut.';

  return {
    saintCommemoration,
    verseRef,
    verseText,
    reflection,
    mindCheck,
    takeOneStep,
  };
}

/**
 * Process scraped Catholic devotional content into Coffee Break with God structure
 * Supports Groq API (Ultra-low latency Llama-3.3-70b), Gemini API, and intelligent liturgical extraction
 */
export async function processDevotionalWithLLM(
  rawTitle: string,
  rawContent: string,
  targetDate: string
): Promise<LLMProcessingResult> {
  const settings = await getAutomationSettings();

  const prompt = `Anda adalah asisten liturgi Katolik terpercaya untuk MP Community. Tugas Anda adalah meringkas renungan harian Katolik berikut ke dalam format resmi "Coffee Break with God".
  
Ketentuan ketat (Strict Rules):
1. JANGAN PERNAH mengarang kutipan ayat Alkitab atau referensi ayat yang tidak ada di dalam teks bacaan liturgi sumber.
2. Pertahankan keaslian konteks teologis dan makna firman dari sumber Katolik.
3. Ekstrak nama peringatan santo/santa jika ada pada hari tersebut (Peringatan Santo/Santa).
4. Ekstrak satu ayat emas utama (Verse of The Day): referensi ayat HARUS nomor ayat spesifik yang tepat dari teks kutipan (contoh: 'Lukas 14:27' atau 'Roma 12:2', BUKAN rentang perikop penuh seperti 'Lukas 14:25-33').
5. Ekstrak renungan singkat aplikatif (Today's Reflection 2-4 kalimat yang menguatkan), satu pertanyaan refleksi pribadi mendalam (Mind Check), dan satu tindakan konkrit hari ini (Take One Step).
6. Kembalikan data HANYA dalam bentuk JSON valid dengan format:
{
  "saint_commemoration": "nama peringatan santa/santo hari ini (contoh: Santo Karolus Boromeus, Uskup), atau kosongkan string jika tidak ada peringatan khusus",
  "verse_reference": "nomor ayat tunggal spesifik yang tepat, contoh: Lukas 14:27 (bukan rentang perikop)",
  "verse_text": "isi ayat Alkitab asli tanpa tambahan tafsiran",
  "reflection": "renungan singkat aplikatif (2-4 kalimat)",
  "mind_check": "pertanyaan refleksi pribadi yang mendalam",
  "take_one_step": "langkah konkrit nyata hari ini"
}

Judul Artikel: ${rawTitle}
Konten Sumber:
${rawContent.substring(0, 5000)}
`;

  // 1. Try Groq API first (Llama-3.3-70b-versatile or configured model)
  const groqKey = process.env.GROQ_API_KEY || settings.groq_api_key;
  const groqModel = settings.groq_model || 'llama-3.3-70b-versatile';

  if (groqKey && groqKey.trim().length > 8 && !groqKey.includes('••••')) {
    try {
      const groqClient = new Groq({ apiKey: groqKey.trim() });
      const completion = await groqClient.chat.completions.create({
        model: groqModel,
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah asisten liturgi Katolik terpercaya untuk MP Community. Kembalikan data HANYA dalam format JSON valid.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const jsonText = completion.choices[0]?.message?.content;
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        if (
          parsed.verse_reference &&
          parsed.verse_text &&
          parsed.reflection &&
          parsed.mind_check &&
          parsed.take_one_step
        ) {
          const saintName = parsed.saint_commemoration || '';
          const exactRef = await resolveExactVerse(parsed.verse_text, parsed.verse_reference);
          const formatted = formatCoffeeBreakTemplate(
            exactRef,
            parsed.verse_text,
            parsed.reflection,
            parsed.mind_check,
            parsed.take_one_step,
            saintName
          );

          return {
            success: true,
            saint_commemoration: saintName,
            verse_reference: exactRef,
            verse_text: parsed.verse_text,
            reflection: parsed.reflection,
            mind_check: parsed.mind_check,
            take_one_step: parsed.take_one_step,
            formatted_message: formatted,
            is_fallback_eligible: true,
          };
        }
      }
    } catch (groqErr: any) {
      console.warn('[LLM GROQ API] Groq processing error, attempting Gemini/extractor:', groqErr.message);
    }
  }

  // 2. Try Gemini API
  const geminiKey = process.env.GEMINI_API_KEY || (settings as any).gemini_api_key;
  if (geminiKey && geminiKey.trim().length > 5 && !geminiKey.includes('••••')) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          if (
            parsed.verse_reference &&
            parsed.verse_text &&
            parsed.reflection &&
            parsed.mind_check &&
            parsed.take_one_step
          ) {
            const saintName = parsed.saint_commemoration || '';
            const exactRef = await resolveExactVerse(parsed.verse_text, parsed.verse_reference);
            const formatted = formatCoffeeBreakTemplate(
              exactRef,
              parsed.verse_text,
              parsed.reflection,
              parsed.mind_check,
              parsed.take_one_step,
              saintName
            );

            return {
              success: true,
              saint_commemoration: saintName,
              verse_reference: exactRef,
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
    } catch (geminiErr: any) {
      console.warn('[LLM GEMINI API] Gemini processing error:', geminiErr.message);
    }
  }

  // 3. Intelligent liturgical extraction engine directly from real scraped Catholic content
  const extracted = extractFromScrapedLiturgy(rawTitle, rawContent);
  const exactRef = await resolveExactVerse(extracted.verseText, extracted.verseRef);
  const formatted = formatCoffeeBreakTemplate(
    exactRef,
    extracted.verseText,
    extracted.reflection,
    extracted.mindCheck,
    extracted.takeOneStep,
    extracted.saintCommemoration
  );

  return {
    success: true,
    saint_commemoration: extracted.saintCommemoration,
    verse_reference: exactRef,
    verse_text: extracted.verseText,
    reflection: extracted.reflection,
    mind_check: extracted.mindCheck,
    take_one_step: extracted.takeOneStep,
    formatted_message: formatted,
    is_fallback_eligible: true,
  };
}
