import OpenAI from 'openai';

let openai;

export const initOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

export const generateChapterSummary = async (messages) => {
    const client = initOpenAI();
    if (!client) throw new Error("OpenAI API Key missing");

    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Tu es un archiviste de jeu de rôle. Résume ce chapitre de l'aventure en un texte narratif détaillé (environ 300 mots) qui servira de mémoire pour la suite. Trouve aussi un titre évocateur pour ce chapitre. Format de réponse JSON attendu : { \"title\": \"Titre du chapitre\", \"summary\": \"Texte du résumé...\" }" },
            { role: "user", content: conversationText }
        ],
        response_format: { type: "json_object" }
    });
    
    // On attend un JSON { "title": "...", "summary": "..." }
    // On force un peu le format dans le prompt user si besoin, ou on fait confiance au model gpt-4o avec response_format json_object
    // Mais il faut préciser la structure JSON attendue dans le system prompt.
    
    return JSON.parse(completion.choices[0].message.content);
};

