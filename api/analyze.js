export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, gender, type, history, lang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(200).json({ text: "Eroare: Cheia API lipsește din Vercel (Environment Variables)." });

    // FOLOSIM EXACT MODELUL DIN SCREENSHOT-UL TĂU
    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const pronoun = gender === 'el' ? 'el' : 'ea';
    let prompt = "";

    if (type === 'initial') {
      prompt = `Ești un psihoterapeut expert în relații. Utilizatorul vrea să-i scrie lui ${pronoun}: "${message}" cu scopul: "${objective}". 
      Analizează draftul în 3 paragrafe calde, umane, fără titluri sau steluțe. Limba: ${lang}.`;
    } else {
      prompt = `Ești un psihoterapeut într-un dialog de suport. Istoric: ${JSON.stringify(history)}. 
      Utilizatorul spune: "${message}". Răspunde scurt, empatic, fără steluțe. Limba: ${lang}.`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    // DACĂ GOOGLE DĂ EROARE, O TRIMITEM DIRECT LA UTILIZATOR SĂ O VEDEM
    if (data.error) {
      return res.status(200).json({ text: "Eroare de la Google: " + data.error.message });
    }

    if (data.candidates && data.candidates[0].content) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(200).json({ text: "Google a trimis un răspuns gol. Detalii: " + JSON.stringify(data) });
    }

  } catch (error) {
    return res.status(200).json({ text: "Eroare Server Vercel: " + error.message });
  }
}
