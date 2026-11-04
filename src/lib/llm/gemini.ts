import { Devotional } from '@/types';
import Groq from 'groq-sdk';
import { getAutomationSettings } from '../db/store';
import { resolveExactVerse, formatVerseReference } from '../bible/resolver';

export { formatVerseReference };

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
  const cleanRef = formatVerseReference(verseRef);

  return `╔═══════☩══♛══☩═══════╗
 ☕ 𝐂𝐎𝐅𝐅𝐄𝐄 𝐁𝐑𝐄𝐀𝐊 𝐖𝐈𝐓𝐇 𝐆𝐎𝐃 ✝️
╚═══════☩══✦══☩═══════╝
${saintSection}
📖 𝗩𝗲𝗿𝘀𝗲 𝗼𝗳 𝗧𝗵𝗲 𝗗𝗮𝘆 ⋆⋅☆
${cleanRef}
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

// Comprehensive liturgical Golden Verse map for Catholic daily Gospel pericopes with tailored youth reflections
const GOSPEL_GOLDEN_VERSES: Record<
  string,
  { ref: string; text: string; reflectionSummary?: string; mindCheck?: string; takeOneStep?: string }
> = {
  'Lukas 15:1-10': {
    ref: 'Lukas 15:7',
    text: 'Demikian juga akan ada sukacita di sorga karena satu orang berdosa yang bertobat.',
    reflectionSummary:
      'Tuhan nggak pernah menyerah mencari kita, bahkan saat kita merasa tersesat atau menjauh di tengah beban kuliah. Di mata-Nya, setiap kita itu berharga banget dan selalu ada pelukan pengampunan buat memulai lagi bareng Dia.',
    mindCheck:
      'Saat kamu merasa terasing, gagal, atau overthinking masa depan, apa yang sebenarnya menghalangi kamu untuk berserah dan mengakui bahwa kamu butuh pelukan kasih Tuhan?',
    takeOneStep:
      'Ketik satu doa jujur di notes hp tanpa jaim: akui beban yang lagi bikin kamu ngerasa jauh, dan serahkan seutuhnya ke tangan Tuhan hari ini.',
  },
  'Lukas 16:1-8': {
    ref: 'Lukas 16:8',
    text: 'Anak-anak dunia ini lebih cerdik terhadap sesamanya daripada anak-anak terang.',
    reflectionSummary:
      'Kalau buat urusan tugas, karier, dan masa depan kita bisa se-effort itu, jangan sampai urusan rohani dan relasi bareng Tuhan kita santai-santai aja. Yuk lebih bijak dan sungguh-sungguh mengelola kepercayaan yang Tuhan kasih.',
    mindCheck:
      'Jika energimu terkuras 90% buat urusan duniawi dan validasi sosmed, sisa berapa persen hati dan waktumu yang benar-benar kamu persembahkan buat Tuhan?',
    takeOneStep:
      'Alokasikan 5 menit hening pertama sebelum scrolling media sosial begitu bangun tidur besok pagi untuk menyapa Tuhan.',
  },
  'Lukas 16:9-15': {
    ref: 'Lukas 16:10',
    text: 'Barangsiapa setia dalam perkara-perkara kecil, ia setia juga dalam perkara-perkara besar.',
    reflectionSummary:
      'Terkadang kita nunggu momentum besar baru mau setia. Padahal integritas dan karakter kita dibentuk dari hal-hal kecil tiap hari: disiplin waktu, jujur ngerjain tugas, dan konsisten jaga hati.',
    mindCheck:
      'Hal kecil apa dalam kuliah atau pertemanan yang masih sering kamu sepelekan karena ngerasa "ah cuma hal sepele nggak ada yang lihat"?',
    takeOneStep:
      'Selesaikan satu tugas kecil yang selama ini kamu tunda-tunda hari ini dengan sepenuh hati dan jujur tanpa jalan pintas.',
  },
  'Lukas 17:7-10': {
    ref: 'Lukas 17:10',
    text: 'Apabila kamu telah melakukan segala sesuatu yang ditugaskan kepadamu, hendaklah kamu berkata: Kami adalah hamba-hamba yang tidak berguna.',
    reflectionSummary:
      'Melayani dan berbuat baik itu bukan ajang cari panggung atau validasi manusia. Ketika kita melayani dengan tulus tanpa pamrih, di situlah damai dan sukacita sejati bakal ngalir dalam hidup kita.',
    mindCheck:
      'Ketika kamu berbuat baik atau aktif di komunitas/kampus, motivasi terdalammu beneran tulus atau diam-diam masih haus pengakuan dan pujian orang lain?',
    takeOneStep:
      'Lakukan satu kebaikan tersembunyi hari ini untuk teman atau orang terdekat tanpa menceritakannya ke siapa pun atau mempostingnya di medsos.',
  },
  'Matius 25:1-13': {
    ref: 'Matius 25:13',
    text: 'Karena itu, berjaga-jagalah, sebab kamu tidak tahu akan hari maupun akan saatnya.',
    reflectionSummary:
      'Jangan biarkan pelita iman kita padam karena terdistraksi hiruk-pikuk rutinitas dan scrolling sosmed. Tetap jaga hati yang peka dan siap sedia mendengarkan suara Tuhan di setiap momen.',
    mindCheck:
      'Apakah "minyak pelita" rohanimu masih menyala hangat, atau batinmu sudah mulai kering dan lelah karena terlalu sibuk nugas tanpa hening bareng Tuhan?',
    takeOneStep:
      'Matikan notifikasi gadget selama 5 menit saat sore atau malam ini, nyalakan lilin atau hening, dan isi kembali energi jiwamu bersama Kristus.',
  },
  'Yohanes 2:13-22': {
    ref: 'Yohanes 2:19',
    text: 'Rombak Bait Allah ini, dan dalam tiga hari Aku akan mendirikannya kembali.',
    reflectionSummary:
      'Tubuh dan hati kita adalah bait Roh Kudus yang hidup. Yuk bersihin hati kita dari rasa dendam, iri hati, dan overthinking yang nggak berfaedah, biar hadirat Tuhan benar-benar nyata memimpin langkah kita.',
    mindCheck:
      '"Barang dagangan" atau sampah emosi apa yang saat ini mengotori hatimu: rasa iri pada pencapaian circle kampus, atau dendam yang belum selesai?',
    takeOneStep:
      'Sebut nama orang yang pernah mengecewakanmu dalam doa pribadi hari ini, dan secara sadar putuskan untuk melepaskan pengampunan.',
  },
  'Lukas 14:25-33': {
    ref: 'Lukas 14:27',
    text: 'Barangsiapa tidak memikul salibnya dan mengikut Aku, ia tidak dapat menjadi murid-Ku.',
    reflectionSummary:
      'Mengikut Yesus bukan berarti hidup bebas hambatan, tapi punya penyertaan Tuhan di setiap proses. Belajar pikul komitmen kita hari ini dengan setia, karena Tuhan yang bakal kuatkan kita.',
    mindCheck:
      'Ketika komitmen kuliah atau pelayanan mulai terasa berat dan bikin capek, apakah kamu cenderung langsung mau menyerah atau datang minta kekuatan ke Tuhan?',
    takeOneStep:
      'Tuliskan satu tantangan terberatmu minggu ini di kertas, lalu buat komitmen untuk menjalaninya dengan senyuman dan doa penyerahan.',
  },
};

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
  // 1. Extract Saint Commemoration or Feast (Peringatan / Pesta / Hari Raya)
  let saintCommemoration = '';
  const saintMatch = rawContent.match(
    /(?:Peringatan(?:\s+(?:Wajib|Fakultatif))?|Pesta|Hari Raya)\s*[:\-–]?\s*([^\n\r–]+?)(?=(?:\n|Pekan|Tahun|Bacaan|Mazmur|Warna|$))/i
  );
  if (saintMatch && saintMatch[1].trim().length > 3) {
    saintCommemoration = saintMatch[1].trim();
  } else {
    // Only match title if it starts with Peringatan / Pesta
    const titleSaintMatch = rawTitle.match(
      /(?:Peringatan|Pesta|Hari Raya)\s*(?:Santo|Santa|Beato|Beata|Para Martir|Hari Arwah|Pemberkatan Basilika)\s+[^\n\r–,]+/i
    );
    if (titleSaintMatch) {
      saintCommemoration = titleSaintMatch[0].replace(/^(?:Peringatan|Pesta|Hari Raya)\s+/i, '').trim();
    }
  }

  // 2. Extract Gospel reference (Bacaan Injil)
  let gospelBook = '';
  let gospelChapterVerse = '';
  const injilMatch = rawContent.match(
    /Bacaan Injil\s*[:\-–]?\s*([1-3]?\s*[A-Za-z]+)\s*(\d+:\d+(?:[–-]\d+)?)/i
  );

  if (injilMatch) {
    gospelBook = injilMatch[1].trim();
    gospelChapterVerse = injilMatch[2].replace('–', '-').trim();
  } else {
    // Look for standard Catholic Gospel books in text
    const genericGospel = rawContent.match(/(?:Injil\s+)?(Matius|Markus|Lukas|Yohanes)\s*(\d+:\d+(?:[–-]\d+)?)/i);
    if (genericGospel) {
      gospelBook = genericGospel[1].trim();
      gospelChapterVerse = genericGospel[2].replace('–', '-').trim();
    } else {
      gospelBook = 'Lukas';
      gospelChapterVerse = '14:27';
    }
  }

  const rawGospelRef = `${gospelBook} ${gospelChapterVerse}`;
  const normalizedGospelKey = rawGospelRef.replace(/\s+/g, ' ');
  const knownEntry = GOSPEL_GOLDEN_VERSES[normalizedGospelKey];

  // 3. Extract Verse Text
  let verseText = '';
  let verseRef = knownEntry ? knownEntry.ref : rawGospelRef;

  // Check for explicit "Ayat inspirasi:"
  const quoteInspirasi = rawContent.match(
    /Ayat inspirasi\s*[:\-–]?\s*[\n\s]*[“"']?([^”"'\n\r]{15,250})/i
  );
  if (quoteInspirasi && quoteInspirasi[1].trim().length > 15) {
    verseText = quoteInspirasi[1].trim();
  } else {
    // Check for quoted verse with Unicode curly or standard quotes
    const quoteMatches = rawContent.match(/[“"']([^“”"'\r\n]{18,220})[”"']/g);
    if (quoteMatches && quoteMatches.length > 0) {
      // Pick first meaningful quote
      const cleanQ = quoteMatches[0].replace(/^[“"']|[”"']$/g, '').trim();
      if (cleanQ.length > 18 && !cleanQ.toLowerCase().startsWith('baca juga')) {
        verseText = cleanQ;
      }
    }
  }

  // If quote still empty, use known golden verse or spoken sentence
  if (!verseText) {
    if (knownEntry) {
      verseText = knownEntry.text;
    } else {
      const sentenceMatch = rawContent.match(
        /(?:Yesus bersabda|berkatalah Yesus|sabda Tuhan)[^:.]*:\s*([^.?!]{20,180}[.?!])/i
      );
      if (sentenceMatch) {
        verseText = sentenceMatch[1].trim();
      } else {
        // Fallback to first verse of pericope
        verseText = 'Barangsiapa setia dalam perkara-perkara kecil, ia setia juga dalam perkara-perkara besar.';
        verseRef = 'Lukas 16:10';
      }
    }
  }

  // If verseRef is still a range like "Lukas 15:1-10", resolve to single golden verse
  if (verseRef.includes('-')) {
    if (knownEntry) {
      verseRef = knownEntry.ref;
    } else {
      const singleM = verseRef.match(/^([1-3]?\s*[A-Za-z]+)\s*(\d+):(\d+)-\d+$/);
      if (singleM) {
        verseRef = `${singleM[1]} ${singleM[2]}:${singleM[3]}`;
      }
    }
  }

  // 4. Extract Theme & Reflection
  let theme = '';
  const themeMatch = rawContent.match(/(?:Tema Renungan|Tema)\s*[:\-–]?\s*([^\n\r]+)/i);
  if (themeMatch && themeMatch[1].trim().length > 4) {
    theme = themeMatch[1].trim();
  }

  let reflection = '';
  if (knownEntry?.reflectionSummary) {
    reflection = knownEntry.reflectionSummary;
  } else {
    // Extract concise reflection from Pengantar or first commentary paragraph
    const pengantarMatch = rawContent.match(
      /(?:Pengantar Renungan[^\n]*\n)([\s\S]*?)(?=(?:Bacaan I|Mazmur|Bait|Lukas|Matius|Yohanes|Filipi|Refleksi|\n\n))/i
    );
    if (pengantarMatch && pengantarMatch[1].trim().length > 40) {
      const cleanP = pengantarMatch[1].replace(/\s+/g, ' ').trim();
      const periodIdx = cleanP.indexOf('.', 120);
      reflection = periodIdx > 0 && periodIdx < 280 ? cleanP.slice(0, periodIdx + 1).trim() : cleanP.slice(0, 250).trim() + '.';
    } else {
      const paragraphs = rawContent
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 50 && !p.startsWith('Bacaan') && !p.startsWith('Mazmur') && !p.startsWith('Pekan'));
      if (paragraphs.length > 0) {
        const p = paragraphs[0];
        const dotIdx = p.indexOf('.', 100);
        reflection = dotIdx > 0 && dotIdx < 280 ? p.slice(0, dotIdx + 1).trim() : p.slice(0, 250).trim() + '.';
      } else {
        reflection = theme
          ? `Tema hari ini mengajak kita merenungkan "${theme}". Di tengah hiruk-pikuk aktivitas dan kuliah, mari luangkan waktu sejenak mengandalkan pimpinan Tuhan di setiap langkah.`
          : 'Di tengah padatnya tugas dan rutinitas, firman hari ini mengingatkan kita untuk selalu mengandalkan Tuhan agar hati tetap damai dan terarah.';
      }
    }
  }

  // Clean reflection length: strictly max 300 characters
  if (reflection.length > 300) {
    const endDot = reflection.lastIndexOf('.', 295);
    reflection = endDot > 100 ? reflection.slice(0, endDot + 1).trim() : reflection.slice(0, 290).trim() + '...';
  }

  // 5. Mind Check
  let mindCheck = '';
  if (knownEntry?.mindCheck) {
    mindCheck = knownEntry.mindCheck;
  } else if (theme) {
    mindCheck = `Merespons tema "${theme}", apa satu kebiasaan atau kekhawatiran terbesar dalam perkuliahanmu yang selama ini masih kamu tahan sendiri dan belum berani kamu serahkan ke tangan Tuhan?`;
  } else {
    mindCheck = `Saat rutinitas dan deadline perkuliahan mulai menekan, apa yang paling sering mengalihkan pandanganmu dari kebenaran firman ${verseRef}?`;
  }

  // 6. Take One Step
  let takeOneStep = '';
  if (knownEntry?.takeOneStep) {
    takeOneStep = knownEntry.takeOneStep;
  } else if (theme) {
    takeOneStep = `Wujudkan tema "${theme}" hari ini: pilih satu hal konkret yang kamu hadapi hari ini, jalani dengan kejujuran hati, dan kirimkan satu pesan penyemangat kepada teman yang sedang lelah.`;
  } else {
    takeOneStep = `Tuliskan satu ayat firman ${verseRef} di layar kunci hp atau catatan mejamu sebagai pengingat kehadiran Tuhan sepanjang aktivitas hari ini.`;
  }

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
 * Supports Groq API (openai/gpt-oss-120b, llama-3.3-70b-versatile), Gemini API, and intelligent liturgical extraction
 */
export async function processDevotionalWithLLM(
  rawTitle: string,
  rawContent: string,
  targetDate: string
): Promise<LLMProcessingResult> {
  const settings = await getAutomationSettings();

  const prompt = `Anda adalah sahabat rohani sekaligus asisten liturgi Katolik untuk komunitas anak muda dan mahasiswa "MP Community".
Tugas Anda adalah merangkum renungan harian Katolik berikut ke dalam format resmi "Coffee Break with God" dengan gaya bahasa yang GAUL, SANTAI, HANGAT, KEKINIAN, dan SANGAT RELATABLE dengan kehidupan sehari-hari anak muda serta mahasiswa.

Panduan Persona & Gaya Bahasa (Tone of Voice):
- Target Audiens: Mahasiswa & anak muda (Gen Z / Young Adults).
- Bahasa: Gaul santai, akrab (gunakan sapaan seperti "kita", "kamu"), luwes, TIDAK KAKU/FORMAL, tidak menggunakan bahasa kuno/kolot, dan tidak menggurui. Seperti obrolan hangat dari sahabat rohani yang saling menguatkan.
- Konteks Nyata: Hubungkan refleksi secara natural dengan realita kehidupan anak muda & perkuliahan — misalnya: deadline tugas/kuis, skripsi, overthinking masa depan & karier, FOMO, burnout/lelah mental, scrolling sosmed tanpa sadar, drama circle pertemanan, relationship/gebetan, dan pentingnya nemuin damai sejati bareng Tuhan di sela rutinitas yang padat.

Ketentuan ketat (Strict Rules):
1. JANGAN PERNAH mengarang kutipan ayat Alkitab atau teks firman. Ayat Alkitab harus asli dan akurat dari bacaan liturgi sumber Katolik.
2. Pertahankan keaslian konteks teologis dan makna firman dari sumber Katolik.
3. Ekstrak nama peringatan santo/santa jika ada pada hari tersebut (Peringatan Santo/Santa). Jika tidak ada peringatan khusus, kosongkan string "".
4. Ekstrak satu ayat emas utama (Verse of The Day): referensi ayat HARUS diawali dengan 'Bdk.' dan nomor ayat tunggal spesifik yang tepat dari teks kutipan (contoh: 'Bdk. Lukas 15:7' atau 'Bdk. Lukas 16:10', BUKAN rentang perikop penuh seperti 'Lukas 15:1-10').
5. Buat "Today's Reflection" (2-3 kalimat): Renungan singkat yang mengena, hangat, gaul, dan nyambung banget sama realita anak muda/kuliahan.
6. Buat "Mind Check": Satu pertanyaan refleksi diri yang "jleb", SPESIFIK dan MENDALAM berakar langsung pada pesan Injil/tema hari ini (JANGAN gunakan pertanyaan klise/template umum!).
7. Buat "Take One Step": Satu aksi konkrit praktis yang sangat SPESIFIK dan LANGSUNG BERHUBUNGAN dengan pesan firman hari ini (JANGAN mengulang formula umum seperti "jeda 2 menit tarik napas"!).
8. Kembalikan data HANYA dalam bentuk JSON valid dengan format:
{
  "saint_commemoration": "nama peringatan santa/santo hari ini atau kosong jika tidak ada",
  "verse_reference": "nomor ayat tunggal spesifik yang tepat diawali dengan Bdk., contoh: Bdk. Lukas 15:7",
  "verse_text": "isi ayat Alkitab asli tanpa tambahan tafsiran",
  "reflection": "renungan 2-3 kalimat bergaya bahasa gaul santai khas anak muda/kuliahan yang aplikatif",
  "mind_check": "pertanyaan refleksi diri yang jleb dan spesifik dengan tema firman hari ini",
  "take_one_step": "langkah konkrit nyata hari ini yang spesifik nyambung dengan tema firman"
}

Judul Artikel: ${rawTitle}
Konten Sumber:
${rawContent.substring(0, 4500)}
`;

  // 1. Try Groq API first
  const groqKey = process.env.GROQ_API_KEY || settings.groq_api_key;
  const preferredModel = settings.groq_model || 'openai/gpt-oss-120b';

  if (groqKey && groqKey.trim().length > 8 && !groqKey.includes('••••')) {
    const candidateModels = Array.from(
      new Set([preferredModel, 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'])
    ).filter(Boolean);

    const groqClient = new Groq({ apiKey: groqKey.trim() });

    for (const modelToTry of candidateModels) {
      try {
        const completion = await groqClient.chat.completions.create({
          model: modelToTry,
          messages: [
            {
              role: 'system',
              content:
                'Anda adalah sahabat rohani anak muda dan mahasiswa Katolik di MP Community. Kemas renungan dengan bahasa gaul, santai, hangat, dan sangat relatable bagi kehidupan perkuliahan dan anak muda saat ini, tanpa mengubah keaslian isi ayat firman Tuhan. Kembalikan data HANYA dalam format JSON valid.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
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
            const finalRef = formatVerseReference(exactRef);
            const formatted = formatCoffeeBreakTemplate(
              finalRef,
              parsed.verse_text,
              parsed.reflection,
              parsed.mind_check,
              parsed.take_one_step,
              saintName
            );

            console.log(`[LLM GROQ SUCCESS] Date: ${targetDate} processed via Groq model: ${modelToTry}`);
            return {
              success: true,
              saint_commemoration: saintName,
              verse_reference: finalRef,
              verse_text: parsed.verse_text,
              reflection: parsed.reflection,
              mind_check: parsed.mind_check,
              take_one_step: parsed.take_one_step,
              formatted_message: formatted,
              is_fallback_eligible: true,
            };
          }
        }
      } catch (modelErr: any) {
        console.warn(`[LLM GROQ] Notice on model ${modelToTry}:`, modelErr.message);
      }
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
              temperature: 0.4,
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
            const finalRef = formatVerseReference(exactRef);
            const formatted = formatCoffeeBreakTemplate(
              finalRef,
              parsed.verse_text,
              parsed.reflection,
              parsed.mind_check,
              parsed.take_one_step,
              saintName
            );

            return {
              success: true,
              saint_commemoration: saintName,
              verse_reference: finalRef,
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
  const finalRef = formatVerseReference(exactRef);
  const formatted = formatCoffeeBreakTemplate(
    finalRef,
    extracted.verseText,
    extracted.reflection,
    extracted.mindCheck,
    extracted.takeOneStep,
    extracted.saintCommemoration
  );

  return {
    success: true,
    saint_commemoration: extracted.saintCommemoration,
    verse_reference: finalRef,
    verse_text: extracted.verseText,
    reflection: extracted.reflection,
    mind_check: extracted.mindCheck,
    take_one_step: extracted.takeOneStep,
    formatted_message: formatted,
    is_fallback_eligible: true,
  };
}
