export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, lang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(200).json({ text: "Eroare: Cheia API lipsește din Environment Variables în Vercel." });

    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `
              Ești un Psihoterapeut expert în relații. 
              Utilizatorul vrea să trimită: "${message}" cu scopul: "${objective}". Limba: ${lang}.
              
              Sarcina ta:
              1. Validare Scurtă (fără judecată).
              2. Analiza Subtextului (ce vrea de fapt să obțină prin acest mesaj).
              3. Riscuri (ce se întâmplă dacă trimite și nu primește răspuns).
              4. O întrebare profundă de reflexie pentru utilizator.
              5. O alternativă practică la trimiterea mesajului.
              
              Fii empatic, profesionist și concis.
            ` 
          }]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ text: "Eroare de la Google: " + data.error.message });
    }

    if (data.candidates && data.candidates[0].content) {
      const aiText = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ text: aiText });
    } else {
      return res.status(200).json({ text: "AI-ul nu a putut genera un răspuns. Verifică Logs în Vercel." });
    }

  } catch (error) {
    return res.status(200).json({ text: "Eroare server (catch): " + error.message });
  }
}
