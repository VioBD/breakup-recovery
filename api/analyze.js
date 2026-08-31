// Best-effort rate limiter: persists only within a warm Vercel lambda instance,
// not across cold starts/regions. Good enough as a first cost guard; swap for
// Upstash/Vercel KV if real distributed limiting is needed.
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 20;

const CRISIS_KEYWORDS = [
  'sinucid', 'sa ma omor', 'să mă omor', 'sa mor', 'să mor', 'vreau sa mor', 'vreau să mor',
  'nu mai vreau sa traiesc', 'nu mai vreau să trăiesc', 'sa-mi fac rau', 'să-mi fac rău',
  'nu mai am rost', 'mai bine mor', 'as vrea sa dispar', 'aș vrea să dispar', 'nu mai vreau sa exist',
  'suicide', 'kill myself', 'want to die', 'end my life', 'self harm', 'self-harm',
  'hurt myself', "don't want to live", 'no reason to live', 'better off dead'
];

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function containsCrisisSignal(message) {
  const normalized = normalize(message);
  return CRISIS_KEYWORDS.some(kw => normalized.includes(normalize(kw)));
}

function crisisResponse(lang) {
  if (lang === 'en') {
    return "What you just wrote sounds like a lot of pain, and I'm not equipped to support you with this the way you need right now. If you're in immediate danger, call your local emergency number (112 across the EU and Moldova, 911 in the US/Canada). For emotional support, find a helpline in your country at findahelpline.com (in the US: call or text 988). You don't have to go through this alone.";
  }
  return "Ce ai scris sună ca o durere foarte mare, iar eu nu sunt echipat să te ajut cu asta așa cum ai nevoie acum. Te rog vorbește cu cineva chiar acum:\n— Pericol imediat: 112 (non-stop, gratuit, Moldova și România)\n— Moldova: Linia Verde pentru Prevenirea Suicidului — chat pe pentruviata.md sau 060806623 (luni–vineri, 19:00–21:00)\n— România: Telefonul pentru prevenirea suicidului — 0800 801 200 (gratuit, non-stop)\nNu ești singur/ă.";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, gender, type, history, lang } = req.body;

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (!checkRateLimit(ip)) {
      return res.status(200).json({
        text: lang === 'en'
          ? "You've sent quite a few messages in a short time. Please wait a few minutes before continuing."
          : "Ai trimis destul de multe mesaje într-un timp scurt. Te rog așteaptă câteva minute înainte să continui."
      });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(200).json({
        text: lang === 'en'
          ? `Your message is a bit long for me to process well — please keep it under ${MAX_MESSAGE_LENGTH} characters.`
          : `Mesajul tău e cam lung ca să-l pot procesa bine — te rog păstrează-l sub ${MAX_MESSAGE_LENGTH} de caractere.`
      });
    }

    if (containsCrisisSignal(message)) {
      return res.status(200).json({ text: crisisResponse(lang), crisis: true });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(200).json({ text: "Eroare: Cheia API lipsește din Vercel." });

    const modelName = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const pronoun = gender === 'el' ? 'el' : 'ea';
    const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];

    let prompt = "";
    if (type === 'initial') {
      prompt = `Ești un psihoterapeut expert în relații. Utilizatorul vrea să-i scrie lui ${pronoun}: "${message}" cu scopul: "${objective}".
      Analizează draftul în 3 paragrafe calde, umane, fără titluri sau steluțe: 1. Validare emoție. 2. Subtext (ce vrea de fapt). 3. Riscul trimiterii.
      Încheie cu o singură întrebare scurtă despre cum se simte acum. Limba: ${lang}.`;
    } else {
      prompt = `Ești un psihoterapeut într-un dialog de suport. Istoric: ${JSON.stringify(trimmedHistory)}.
      Utilizatorul spune: "${message}". Răspunde scurt (max 4 rânduri), empatic, fără steluțe sau markdown.
      Folosește tehnici din CBT sau ACT. Pune o întrebare proactivă la final. Limba: ${lang}.`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: type === 'initial' ? 2048 : 1024,
            thinkingConfig: { thinkingLevel: 'low' }
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: "Eroare Google: " + data.error.message });
    }

    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
      const aiText = data.candidates[0].content.parts.map(p => p.text || '').join('').trim();
      if (!aiText) {
        return res.status(200).json({
          text: lang === 'en'
            ? "I couldn't quite finish that thought — could you try sending it again?"
            : "Nu am reușit să formulez un răspuns complet — poți încerca din nou?"
        });
      }
      return res.status(200).json({ text: aiText });
    } else if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
      return res.status(200).json({
        text: lang === 'en'
          ? "I can't respond to that particular message. Could you rephrase it?"
          : "Nu pot răspunde la acest mesaj în forma actuală. Poți să-l reformulezi?"
      });
    } else {
      return res.status(200).json({ text: "Google a trimis un răspuns gol. Verifică Billing." });
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(200).json({ text: "Serverul AI a răspuns prea greu. Te rog încearcă din nou." });
    }
    return res.status(200).json({ text: "Eroare Server: " + error.message });
  }
}
