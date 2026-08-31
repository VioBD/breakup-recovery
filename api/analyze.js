export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, objective, gender, type, history, lang } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-1.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

    const pronoun = gender === 'el' ? 'el' : 'ea';

    let prompt = "";
    if (type === 'initial') {
      prompt = `Ești un psihoterapeut expert. Utilizatorul vrea să-i scrie lui ${pronoun}: "${message}" cu scopul: "${objective}". 
      Analizează draftul în 3 paragrafe calde: 1. Validare emoție. 2. Subtext (ce vrea de fapt). 3. Riscul trimiterii. 
      NU folosi steluțe, titluri sau formatare markdown. Doar text simplu și uman. 
      Încheie cu o singură întrebare scurtă despre cum se simte acum.`;
    } else {
      prompt = `Ești un psihoterapeut într-un dialog de suport. Istoric: ${JSON.stringify(history)}. 
      Utilizatorul spune: "${message}". Răspunde scurt (max 4 rânduri), empatic, fără steluțe sau markdown. 
      Folosește tehnici din CBT sau ACT. Pune o întrebare proactivă la final.`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text: aiText });

  } catch (error) {
    return res.status(200).json({ text: "Eroare server." });
  }
}
