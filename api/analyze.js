export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, lang, gender } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(200).json({ text: "Eroare: Cheia API lipsește." });

    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    // Definirea limbajului în funcție de gen
    const pronoun = gender === 'el' ? 'el' : 'ea';
    const possessive = gender === 'el' ? 'lui' : 'ei';
    const accusative = gender === 'el' ? 'îl' : 'o';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `
              Ești un prieten foarte apropiat și un psiholog empatic. 
              Utilizatorul trece printr-o despărțire și vrea să îi scrie lui ${pronoun}: "${message}".
              Scopul utilizatorului: "${objective}".
              Limba: ${lang}.

              REGULI DE CONECTARE ȘI TON:
              1. Folosește EXCLUSIV genul ${gender === 'el' ? 'masculin (el, lui, îl)' : 'feminin (ea, ei, o)'}. NU folosi "el/ea" sau "lui/ei".
              2. Vorbește direct cu utilizatorul, ca într-o conversație privată.
              3. Dacă mesajul utilizatorului este scurt sau impulsiv, începe prin a-l întreba ceva care să-l facă să reflecteze, de exemplu: "Înainte să analizăm ce ai scris, crezi că ${pronoun} are în acest moment capacitatea de a-ți oferi răspunsul pe care îl cauți?"
              4. Nu folosi titluri sau formatări rigide. Folosește paragrafe calde.

              STRUCTURĂ RĂSPUNS:
              - O frază de conectare umană.
              - O perspectivă asupra a ceea ce se întâmplă în sufletul utilizatorului (de ce simte nevoia să îi scrie lui ${pronoun} acum?).
              - Riscul: Ce se întâmplă dacă ${pronoun} nu răspunde sau răspunde rece?
              - O întrebare de reflexie profundă.
              - Un pas practic imediat pentru a calma agitația.
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
