export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, lang, gender, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const pronoun = (lang === 'ro') ? (gender === 'el' ? 'el' : 'ea') : (gender === 'el' ? 'him' : 'her');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `
              Ești un psihoterapeut expert în relații (CBT, ACT, DBT). 
              Utilizatorul vrea să îi scrie lui ${pronoun}: "${message}".
              Scop: "${objective}". Limba: ${lang}.
              Istoric: ${JSON.stringify(history)}

              MISIUNEA TA:
              1. Analizează profund nevoia din spatele mesajului.
              2. Folosește EXCLUSIV genul ${gender === 'el' ? 'masculin' : 'feminin'} pentru fostul partener.
              3. Răspunde EXCLUSIV în limba: ${lang}.
              
              BIBLIOTECA DE TEHNICI (Alege una relevantă, nu repeta):
              - CBT: Identifică gândurile automate.
              - ACT: Tehnici de defuziune (gândul ca un nor).
              - DBT: Tehnici de supraviețuire în criză (TIPP).
              - Somatic: Grounding (5-4-3-2-1).

              STRUCTURĂ:
              - Validare empatică.
              - Analiza subtextului (ce vrei de fapt?).
              - Riscul trimiterii (re-traumatizare, pierdere control).
              - O întrebare de reflexie profundă.
              - Un pas practic NOU și BAZAT PE ȘTIINȚĂ (nu doar scrie în notes).
            ` 
          }]
        }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    }
  } catch (error) {
    return res.status(200).json({ text: "Error." });
  }
}
