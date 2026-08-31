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
              Ești un prieten foarte înțelept, calm și cu experiență în psihologie. 
              Cineva vrea să trimită acest mesaj fostului partener (sau fostei partenere): "${message}".
              Scopul utilizatorului: "${objective}".
              Limba: ${lang}.

              INSTRUCȚIUNI IMPORTANTE DE TON:
              - Folosește pronume la singular când te referi la fostul partener: "el/ea", "lui/ei", "persoana respectivă". NU folosi "ei/lor" sau "voi".
              - Vorbește direct cu utilizatorul ("tu").
              - Fii cald, dar ferm. Nu folosi semne de tipul # sau *.

              STRUCTURĂ RĂSPUNS:
              1. O frază de validare a emoției (ex: "E firesc să simți asta...").
              2. Analiza sinceră: Ce spune acest mesaj despre nevoia TA actuală? (ex: nevoia de a fi văzut/ă de el/ea).
              3. Riscul: Ce se întâmplă dacă el/ea nu răspunde sau răspunde urât?
              4. O întrebare care să oprească agitația (reflexie).
              5. Un pas practic de făcut ACUM (ex: scrie în Notes, bea apă, fă o plimbare).

              Fii uman, fără titluri mari, folosește paragrafe clare.
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
