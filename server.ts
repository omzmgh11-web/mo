import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const wikiCache = new Map<string, string | null>();
// Track models that hit daily quota limits so we skip them immediately on subsequent requests
const exhaustedModels = new Set<string>();

async function fetchWikiImage(query: string, langCode = "en"): Promise<string | null> {
  if (!query) return null;
  const cleanQuery = String(query)
    .replace(/^(the |a |an |to |le |la |les |l'|un |une |des |du |de la )/i, "")
    .replace(/\([^)]*\)/g, "")
    .split("/")[0]
    .trim();
  if (!cleanQuery) return null;

  const wikiSubdomain = String(langCode).startsWith("fr") ? "fr" : "en";
  const cacheKey = `${wikiSubdomain}:${cleanQuery.toLowerCase()}`;

  if (wikiCache.has(cacheKey)) {
    return wikiCache.get(cacheKey) ?? null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const url = `https://${wikiSubdomain}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      cleanQuery
    )}&prop=pageimages&format=json&pithumbsize=500&redirects=1&origin=*`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SmartFlashcardsApp/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    for (const pageId of Object.keys(pages)) {
      if (pageId !== "-1" && pages[pageId]?.thumbnail?.source) {
        const imgUrl = pages[pageId].thumbnail.source;
        wikiCache.set(cacheKey, imgUrl);
        return imgUrl;
      }
    }
  } catch {
    // Fall back gracefully
  }
  wikiCache.set(cacheKey, null);
  return null;
}

// Detect language and gender/type heuristically from a foreign word
function detectWordMetadata(wordStr: string) {
  const w = String(wordStr || "").trim();
  const lower = w.toLowerCase();

  const isFrench =
    /^(le |la |les |l'|un |une |des |du |de la |se |s')/i.test(lower) ||
    /[éèêëàâùûçîïôœ]/i.test(lower);

  const lang = isFrench ? "fr-FR" : "en-US";

  let g = isFrench ? "m" : "n";
  if (/^(la |une |de la )/i.test(lower)) {
    g = "f";
  } else if (/^(les |des )/i.test(lower)) {
    g = "pl";
  } else if (/^(le |un |du )/i.test(lower)) {
    g = "m";
  } else if (/^to\s+/i.test(lower)) {
    g = "v";
  }

  return { lang, g };
}

interface ParsedVocabItem {
  fr: string;
  ar: string;
  g: string;
  lang: string;
  cat: string;
  kw: string;
  exFr?: string;
  exAr?: string;
}

// Pre-parse multi-column or single-column vocabulary text into individual entries
function parseVocabularyText(rawText: string): {
  isTopicRequest: boolean;
  items: ParsedVocabItem[];
} {
  const text = String(rawText || "").trim();
  if (!text) return { isTopicRequest: false, items: [] };

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Check if it's a single-line Arabic topic request (e.g., "10 كلمات إنجليزي عن السفر")
  const hasLatin = /[a-zA-ZÀ-ÿ]/.test(text);
  if (
    lines.length === 1 &&
    (!hasLatin || /(كلمات|اعطني|هات|عن\s)/i.test(text)) &&
    text.length < 120
  ) {
    return { isTopicRequest: true, items: [] };
  }

  const extracted: ParsedVocabItem[] = [];

  for (const rawLine of lines) {
    // Remove leading bullet numbers like "1.", "1-", "(1)", "•"
    const cleanedLine = rawLine
      .replace(/^[\d٠-٩]+[\.\-\)\s]+/, "")
      .replace(/^[•\-\*]+\s*/, "")
      .trim();

    if (!cleanedLine) continue;

    // Check if the line contains BOTH Latin script (English/French/etc.) and Arabic script
    const hasLineLatin = /[a-zA-ZÀ-ÿ]/.test(cleanedLine);
    const hasLineArabic = /[\u0600-\u06FF]/.test(cleanedLine);

    if (hasLineLatin && hasLineArabic) {
      const latinFirstRegex =
        /([a-zA-ZÀ-ÿœŒæÆ][a-zA-ZÀ-ÿœŒæÆ0-9\s'’\-\/\(\)\.\,]*?)\s*[:=\-–—\|]?\s*([\u0600-\u06FF][\u0600-\u06FF0-9\s\-\/\(\)\.\،\,]*)/g;

      const matches = [...cleanedLine.matchAll(latinFirstRegex)];
      if (matches.length > 0) {
        for (const m of matches) {
          const fr = m[1]
            .replace(/[\d٠-٩]+[\.\-\)]?\s*$/, "")
            .replace(/^[\-\:\=\|]+|[\-\:\=\|]+$/g, "")
            .trim();
          const ar = m[2]
            .replace(/[\d٠-٩]+[\.\-\)]?\s*$/, "")
            .replace(/^[\-\:\=\|]+|[\-\:\=\|]+$/g, "")
            .trim();
          if (fr && ar) {
            const { lang, g } = detectWordMetadata(fr);
            extracted.push({ fr, ar, g, lang, cat: "📚 مفردات", kw: fr });
          }
        }
        continue;
      }
    }

    // If line is only Latin words (e.g. English or French words without Arabic translation)
    const parts = cleanedLine
      .split(/\t+|\s{3,}/)
      .map((p) => p.replace(/^[\d٠-٩]+[\.\-\)\s]+/, "").trim())
      .filter(Boolean);

    for (const part of parts) {
      const { lang, g } = detectWordMetadata(part);
      extracted.push({
        fr: part,
        ar: "",
        g,
        lang,
        cat: "📚 مفردات",
        kw: part,
      });
    }
  }

  return { isTopicRequest: false, items: extracted };
}

// Fast fallback translator when Gemini API is rate-limited (429) or unavailable (503)
async function translateBatchFallback(items: ParsedVocabItem[]): Promise<ParsedVocabItem[]> {
  const needsTranslation = items.filter((it) => !it.ar);
  if (needsTranslation.length === 0) return items;

  try {
    const batchSize = 25;
    for (let i = 0; i < needsTranslation.length; i += batchSize) {
      const slice = needsTranslation.slice(i, i + batchSize);
      const joined = slice.map((it) => it.fr).join("\n");
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=${encodeURIComponent(
        joined
      )}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const fullTranslated = Array.isArray(data?.[0])
          ? data[0].map((seg: unknown[]) => (seg?.[0] ? String(seg[0]) : "")).join("")
          : "";
        const translatedLines = fullTranslated
          .split(/\r?\n/)
          .map((s: string) => s.trim());

        slice.forEach((item, idx) => {
          item.ar = translatedLines[idx] || item.fr;
        });
      }
    }
  } catch {
    for (const item of needsTranslation) {
      if (!item.ar) item.ar = item.fr;
    }
  }

  return items;
}

const SYSTEM_PROMPT = `أنت مساعد تعليمي ذكي ودقيق جداً لإنشاء بطاقات الفلاش كارت (Flashcards) بأي لغة يدخلها المستخدم.

⚠️ القاعدة الذهبية الأولى (حافظ على لغة الكلمات المدخلة كما هي تماماً!):
1. إذا أدخل المستخدم كلمات باللغة الإنجليزية (English) -> احتفظ بالكلمة بالإنجليزية كما هي في حقل "fr" وضع ترجمتها العربية في حقل "ar"، واجعل "lang" قيمتها "en-US". **إياك أن تترجم الكلمات الإنجليزية إلى الفرنسية!**
2. إذا أدخل المستخدم كلمات باللغة الفرنسية (French) -> احتفظ بالكلمة بالفرنسية في حقل "fr" وضع ترجمتها العربية في حقل "ar"، واجعل "lang" قيمتها "fr-FR".
3. إذا أدخل المستخدم كلمات بأي لغة أخرى -> احتفظ بالكلمة بلغتها الأصلية كما أدخلها المستخدم بالضبط في حقل "fr"، وضع المعنى بالعربية في "ar".

⚠️ القاعدة الذهبية الثانية (استخراج 100% من الكلمات دون نقصان):
1. استخرج كل كلمة موجودة في المدخلات بنسبة 100% دون ترك أو حذف أو اختصار أي كلمة إطلاقاً!
2. انتبه للجداول والأعمدة المزدوجة: إذا كان السطر الواحد يحتوي على أكثر من كلمة، استخرج كل كلمة في عنصر مستقل!

البيانات المطلوبة لكل كلمة:
- "fr": الكلمة المطلوب حفظها بنفس اللغة التي كتبها المستخدم بالضبط.
- "ar": الترجمة العربية الدقيقة والواضحة.
- "g": نوع الكلمة أو جنسها: "n" للاسم، "v" للفعل، "adj" للصفة، "m" للمذكر، "f" للمؤنث، "pl" للجمع.
- "cat": التصنيف بالعربية مع إيموجي مناسب.
- "lang": رمز النطق الصوتي: "en-US" للإنجليزية، "fr-FR" للفرنسية، "de-DE" للألمانية، "es-ES" للإسبانية.
- "kw": كلمة مفتاحية قصيرة بالإنجليزية (1-2 كلمة) تصف صورة الكلمة.
- "exFr": جملة قصيرة وبسيطة كمثال على استخدام الكلمة بنفس لغتها الأصلية.
- "exAr": ترجمة جملة المثال إلى العربية.`;

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      fr: { type: Type.STRING },
      ar: { type: Type.STRING },
      g: { type: Type.STRING },
      cat: { type: Type.STRING },
      lang: { type: Type.STRING },
      kw: { type: Type.STRING },
      exFr: { type: Type.STRING },
      exAr: { type: Type.STRING },
    },
    required: ["fr", "ar", "g", "cat", "lang", "kw", "exFr", "exAr"],
  },
};

// Single-pass Gemini call with model rotation and quota memory
async function callGeminiSinglePass(parts: Record<string, unknown>[]): Promise<ParsedVocabItem[]> {
  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
  ];

  // Put non-exhausted models first
  const modelsToTry = [
    ...candidateModels.filter((m) => !exhaustedModels.has(m)),
    ...candidateModels.filter((m) => exhaustedModels.has(m)),
  ];

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      const rawText = response.text ? response.text.trim() : "[]";
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        exhaustedModels.add(modelName);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  throw lastError || new Error("AI Temporarily Unavailable");
}

// Built-in topic presets in case user clicks a topic chip while API key is rate-limited
function getFallbackTopicCards(queryText: string): ParsedVocabItem[] {
  const q = String(queryText || "");
  if (q.includes("إنجليزي") && q.includes("سفر")) {
    return [
      { fr: "flight", ar: "رحلة طيران", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "airplane flight" },
      { fr: "passport", ar: "جواز سفر", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "passport" },
      { fr: "luggage", ar: "أمتعة / حقائب", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "travel luggage" },
      { fr: "boarding pass", ar: "بطاقة صعود الطائرة", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "airport boarding" },
      { fr: "customs", ar: "الجمارك", g: "pl", cat: "✈️ سفر", lang: "en-US", kw: "airport terminal" },
      { fr: "departure", ar: "مغادرة", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "airplane takeoff" },
      { fr: "arrival", ar: "وصول", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "airplane landing" },
      { fr: "reservation", ar: "حجز", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "hotel reception" },
      { fr: "destination", ar: "وجهة السفر", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "world map travel" },
      { fr: "passenger", ar: "مسافر / راكب", g: "n", cat: "✈️ سفر", lang: "en-US", kw: "traveler airport" },
    ];
  }
  if (q.includes("إنجليزي")) {
    return [
      { fr: "achievement", ar: "إنجاز", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "trophy success" },
      { fr: "knowledge", ar: "معرفة", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "library books" },
      { fr: "research", ar: "بحث علمي", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "science laboratory" },
      { fr: "environment", ar: "بيئة", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "green nature forest" },
      { fr: "opportunity", ar: "فرصة", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "open door sunrise" },
      { fr: "development", ar: "تطوير / تنمية", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "modern city growth" },
      { fr: "experience", ar: "خبرة / تجربة", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "workspace laptop" },
      { fr: "technology", ar: "تكنولوجيا", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "computer technology" },
      { fr: "communication", ar: "تواصل", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "people talking" },
      { fr: "solution", ar: "حل", g: "n", cat: "🎓 أكاديمي", lang: "en-US", kw: "lightbulb idea" },
    ];
  }
  if (q.includes("طعام") || q.includes("مأكولات")) {
    return [
      { fr: "le pain", ar: "الخبز", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "french bread baguette" },
      { fr: "le fromage", ar: "الجبن", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "cheese platter" },
      { fr: "la pomme", ar: "التفاحة", g: "f", cat: "🍎 طعام", lang: "fr-FR", kw: "red apple fruit" },
      { fr: "le lait", ar: "الحليب", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "glass of milk" },
      { fr: "le poisson", ar: "السمك", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "cooked fish dish" },
      { fr: "la viande", ar: "اللحم", g: "f", cat: "🍎 طعام", lang: "fr-FR", kw: "steak meat" },
      { fr: "les légumes", ar: "الخضروات", g: "pl", cat: "🍎 طعام", lang: "fr-FR", kw: "fresh vegetables" },
      { fr: "les fruits", ar: "الفواكه", g: "pl", cat: "🍎 طعام", lang: "fr-FR", kw: "fresh fruits basket" },
      { fr: "le café", ar: "القهوة", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "espresso coffee cup" },
      { fr: "le gâteau", ar: "الكعكة / الجاتوه", g: "m", cat: "🍎 طعام", lang: "fr-FR", kw: "chocolate cake" },
    ];
  }
  return [
    { fr: "l'école", ar: "المدرسة", g: "f", cat: "🏫 المدرسة", lang: "fr-FR", kw: "school building" },
    { fr: "la classe", ar: "الفصل الدراسي", g: "f", cat: "🏫 المدرسة", lang: "fr-FR", kw: "classroom desks" },
    { fr: "le livre", ar: "الكتاب", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "open book" },
    { fr: "le cahier", ar: "الكراسة / الدفتر", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "notebook paper" },
    { fr: "le stylo", ar: "القلم الجاف", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "pen writing" },
    { fr: "le professeur", ar: "المعلم", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "teacher blackboard" },
    { fr: "l'élève", ar: "التلميذ / الطالب", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "student studying" },
    { fr: "le tableau", ar: "السبورة", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "chalkboard" },
    { fr: "l'examen", ar: "الامتحان", g: "m", cat: "🏫 المدرسة", lang: "fr-FR", kw: "exam test paper" },
    { fr: "la bibliothèque", ar: "المكتبة", g: "f", cat: "🏫 المدرسة", lang: "fr-FR", kw: "library bookshelves" },
  ];
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  app.post("/api/analyze-words", async (req, res) => {
    try {
      const { text, image } = req.body || {};

      if ((!text || !String(text).trim()) && !image) {
        res.status(400).json({
          error: "يرجى إدخال نص أو كلمات أو رفع صورة لتحليلها.",
        });
        return;
      }

      let finalItems: ParsedVocabItem[] = [];

      if (image && image.data && image.mimeType) {
        const parts = [
          {
            inlineData: {
              data: image.data,
              mimeType: image.mimeType,
            },
          },
          {
            text:
              text && String(text).trim()
                ? `استخرج جميع الكلمات والمفردات الموجودة في الصورة وفي النص التالي بنسبة 100% بنفس لغتها الأصلية:\n\n${String(
                    text
                  ).trim()}`
                : "استخرج جميع الكلمات والمفردات الموجودة في هذه الصورة بالكامل بنسبة 100% بنفس لغتها المكتوبة في الصورة.",
          },
        ];
        try {
          finalItems = await callGeminiSinglePass(parts);
        } catch {
          if (text && String(text).trim()) {
            const { items: parsedLocalItems } = parseVocabularyText(text);
            finalItems =
              parsedLocalItems.length > 0
                ? await translateBatchFallback(parsedLocalItems)
                : getFallbackTopicCards(text);
          } else {
            res.status(503).json({
              error:
                "خادم تحليل الصور مشغول حالياً بسبب انتهاء الحصة المؤقتة، يمكنك لصق الكلمات كنص وسنحللها لك فوراً!",
            });
            return;
          }
        }
      } else {
        const { isTopicRequest, items: parsedLocalItems } =
          parseVocabularyText(text);

        try {
          const promptToSend =
            !isTopicRequest && parsedLocalItems.length > 0
              ? `لديك القائمة المرقمة التالية المكونة من (${parsedLocalItems.length}) كلمة. قم بتحليل وإرجاع جميع الـ (${parsedLocalItems.length}) كلمة بالكامل بنفس لغتها الأصلية دون ترك أي رقم منها، مع جملة مثال حقيقية وواضحة لكل كلمة في exFr وترجمتها في exAr:\n\n` +
                parsedLocalItems
                  .map(
                    (it, idx) =>
                      `${idx + 1}. ${it.fr}${it.ar ? ` = ${it.ar}` : ""}`
                  )
                  .join("\n")
              : String(text).trim();

          const aiItems = await callGeminiSinglePass([{ text: promptToSend }]);

          if (
            !isTopicRequest &&
            parsedLocalItems.length > aiItems.length + 2
          ) {
            const aiMap = new Map(
              aiItems.map((a) => [String(a.fr || "").toLowerCase().trim(), a])
            );
            const merged = parsedLocalItems.map((localItem) => {
              const match = aiMap.get(localItem.fr.toLowerCase().trim());
              return match
                ? {
                    fr: localItem.fr,
                    ar: localItem.ar || match.ar,
                    g: match.g || localItem.g,
                    cat: match.cat || localItem.cat,
                    lang: match.lang || localItem.lang,
                    kw: match.kw || localItem.fr,
                    exFr: match.exFr,
                    exAr: match.exAr,
                  }
                : localItem;
            });
            finalItems = await translateBatchFallback(merged);
          } else {
            finalItems = aiItems;
          }
        } catch {
          // Silently fall back to local parser + translation so no error is thrown or logged
          if (!isTopicRequest && parsedLocalItems.length > 0) {
            finalItems = await translateBatchFallback(parsedLocalItems);
          } else {
            finalItems = getFallbackTopicCards(text);
          }
        }
      }

      const validGenders = new Set(["m", "f", "pl", "n", "v", "adj"]);
      const enriched = [];
      const wikiBatchSize = 15;
      for (let i = 0; i < finalItems.length; i += wikiBatchSize) {
        const batch = finalItems.slice(i, i + wikiBatchSize);
        const batchEnriched = await Promise.all(
          batch.map(async (item) => {
            const { lang: detectedLang, g: detectedG } = detectWordMetadata(
              item.fr
            );
            const gender = validGenders.has(item.g) ? item.g : detectedG;
            const lang = item.lang || detectedLang;
            const wikiImg = await fetchWikiImage(item.kw || item.fr, lang);
            return {
              fr: String(item.fr || "").trim(),
              ar: String(item.ar || "").trim(),
              g: gender,
              cat: String(item.cat || "📚 مفردات").trim(),
              kw: wikiImg || String(item.kw || item.fr || "").trim(),
              lang,
              exFr: item.exFr ? String(item.exFr).trim() : undefined,
              exAr: item.exAr ? String(item.exAr).trim() : undefined,
            };
          })
        );
        enriched.push(...batchEnriched);
      }

      const validCards = enriched.filter((c) => c.fr && c.ar);
      res.json({ cards: validCards });
    } catch {
      res.status(500).json({
        error: "حدث خطأ غير متوقع أثناء معالجة الكلمات. يرجى المحاولة مرة أخرى.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        watch: null,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
