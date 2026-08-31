export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, lang, gender, history } = req.body; // Am adăugat history
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-3-flash-preview"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const pronoun = gender === 'el' ? 'el' : 'ea';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `
              Ești un psihoterapeut expert în relații și un prieten empatic. 
              Utilizatorul trece printr-o despărțire și vrea să îi scrie lui ${pronoun}: "${message}".
              Scopul: "${objective}".
              Limba: ${lang}.
              Istoric conversație: ${JSON.stringify(history)}

              MISIUNEA TA:
              Poartă un dialog terapeutic. Nu livra doar un raport. Dacă e prima interacțiune, pune o întrebare de conectare. Dacă e o continuare, aprofundează subiectul.

              BIBLIOTECA DE TEHNICI (Alege una diferită la fiecare interacțiune, în funcție de context):
              1. ACT (Defuziune): Ajută-l să vadă gândul ca pe un nor care trece, nu ca pe o comandă de acțiune.
              2. CBT (Reîncadrare): Provoacă-i blând credința că acest mesaj va schimba ceva în bine.
              3. DBT (TIPP): Dacă e foarte agitat, recomandă schimbarea temperaturii corpului (apă rece pe față) sau respirație pătrată.
              4. Somatic: Ancorarea în prezent prin simțuri (ce simte sub tălpi, ce aude acum).
              5. Scrisoarea Nescrisă: Doar dacă e nevoie de descărcare masivă.

              REGULI:
              - Folosește EXCLUSIV genul ${gender === 'el' ? 'masculin' : 'feminin'} pentru fostul partener.
              - Fii scurt (max 3 paragrafe) pentru a încuraja dialogul.
              - Încheie mereu cu o întrebare deschisă care să îl invite să exploreze ce simte.
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
    return res.status(200).json({ text: "Eroare server." });
  }
}
