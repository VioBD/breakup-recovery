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
              You are an expert relationship psychotherapist and an empathetic friend. 
              The user is going through a breakup and wants to write to ${pronoun}: "${message}".
              Goal: "${objective}".
              Language: ${lang}. 
              
              IMPORTANT: Respond EXCLUSIVELY in the language: ${lang}.
              
              THERAPEUTIC TOOLBOX (Choose one based on context):
              1. CBT: Challenge the belief that this text will fix the pain.
              2. ACT: Help them see the thought as a passing cloud (defusion).
              3. DBT: If they are in crisis, suggest TIPP (cold water on face, breathing).
              4. Somatic: Grounding through senses.
              
              RULES:
              - Use singular pronouns for the ex: ${lang === 'ro' ? (gender === 'el' ? 'el/lui' : 'ea/ei') : (gender === 'el' ? 'him/his' : 'her/hers')}.
              - Start as a conversation, not a report.
              - Be warm, professional, and deep.
              - End with an open question to encourage reflection.
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
