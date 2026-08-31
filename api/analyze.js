export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, lang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(200).json({ text: "Eroare: Cheia API lipsește." });

    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `
              Ești un prieten foarte înțelept, calm și cu experiență în psihologie (nu folosi termeni medicali grei). 
              Cineva vrea să trimită acest mesaj fostului partener: "${message}".
              Scopul lor: "${objective}".
              Limba: ${lang}.

              Sarcina ta este să scrii un răspuns cald și direct, fără semne de tipul # sau *. 
              Urmează această structură simplă:
              1. O frază de înțelegere (ex: "E normal să te simți așa...").
              2. O analiză sinceră: Ce spune de fapt acest mesaj despre tine? (fără cuvinte complicate).
              3. Riscul: Ce se întâmplă dacă apeși trimite și ei nu răspund cum vrei?
              4. O întrebare care să îi oprească un pic din agitație.
              5. Un pas mic pe care să îl facă ACUM în loc să trimită mesajul.

              Fii direct, uman și folosește paragrafe clare. Nu folosi formatare de tip bold sau titluri mari.
            ` 
          }]
        }]
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(200).json({ text: "Am avut o mică ezitare. Mai încearcă o dată, te rog." });
    }
  } catch (error) {
    return res.status(200).json({ text: "Eroare server: " + error.message });
  }
}
