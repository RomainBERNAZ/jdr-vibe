import OpenAI from 'openai';
import fs from 'fs';

// Configuration OpenAI sera initialisée avec la clé dans le .env
// Assurez-vous que OPENAI_API_KEY est définie dans votre fichier .env
let openai;

const initOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

export const transcribeAndChat = async (req, res) => {
  try {
    const client = initOpenAI();
    if (!client) {
      return res.status(500).json({ error: "Clé API OpenAI manquante dans les variables d'environnement" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier audio fourni" });
    }

    // 1. Transcription (Whisper)
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      language: "fr",
    });

    const userText = transcription.text;
    
    // Récupération du résumé, de l'historique et de la fiche de personnage
    let history = [];
    let summary = "";
    let characterSheet = null;
    
    if (req.body.history) {
      try {
        history = JSON.parse(req.body.history);
      } catch (e) {
        console.error("Erreur parsing historique:", e);
      }
    }
    if (req.body.summary) summary = req.body.summary;
    
    if (req.body.characterSheet) {
        try {
            characterSheet = JSON.parse(req.body.characterSheet);
        } catch (e) {
            console.error("Erreur parsing characterSheet:", e);
        }
    }

    // --- STRATÉGIE DE MÉMOIRE HYBRIDE ---
    // Si l'historique est trop long (> 6 messages), on le compresse dans le résumé
    let newSummary = summary;
    let activeHistory = history;

    if (history.length > 6) {
        const olderMessages = history.slice(0, history.length - 2); // On garde les 2 derniers intacts pour le flow
        activeHistory = history.slice(history.length - 2);
        
        // On demande à l'IA de résumer le vieux contexte
        try {
            const summaryCompletion = await client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Tu es un assistant archiviste de JDR. Ton but est de résumer les événements clés de ce dialogue pour les ajouter au journal de campagne existant. Sois concis mais garde les noms propres, lieux et quêtes." },
                    { role: "user", content: `Résumé actuel: ${summary}\n\nNouveaux échanges à intégrer:\n${JSON.stringify(olderMessages)}` }
                ]
            });
            newSummary = summaryCompletion.choices[0].message.content;
            console.log("Mémoire mise à jour:", newSummary);
        } catch (sumError) {
            console.error("Erreur compression mémoire:", sumError);
        }
    }

    const systemPrompt = `
CONTEXTE ET RÔLE :
Tu es le Gardien de l'Aether, un Maître du Jeu ancien et mystérieux. Ta voix est celle d'un vieux conteur, théâtrale et profonde.
Ta mission est de créer un univers unique, gérer les règles narrativement, et plonger le joueur dans une aventure immersive (Dark-Fantasy).

MÉMOIRE DU JEU :
"${newSummary}"

FICHE DE PERSONNAGE :
${characterSheet ? JSON.stringify(characterSheet) : "Aucun personnage créé."}

RÈGLES DE SORTIE (JSON UNIQUEMENT) :
{
  "text": "Ta narration. Sois théâtral ! Utilise des pauses (...), du suspense. Adresse-toi directement au joueur ('Tu...').",
  "newScene": boolean,
  "imagePrompt": "Description visuelle pour DALL-E",
  "characterSheet": { ... }, // Fiche à jour
  "diceRoll": { "type": "d20", "count": 1 } // Optionnel
}

TON STYLE :
- Ton : Vieux sage, parfois inquiétant, mais captivant.
- Rythme : Prends le temps de poser l'ambiance.
- Descriptions : Sensorielles et poétiques.
- N’utilise pas de listes à puces standard (1., -), préfère les intégrer dans le récit ou utiliser des retours à la ligne marqués pour les choix.
- Pour les choix, tu peux les numéroter clairement (1. 2. 3.) à la toute fin pour qu'ils soient détectés par l'interface.
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...activeHistory,
      { role: "user", content: userText }
    ];

    // On utilise gpt-4o pour une meilleure narration et gestion des règles
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" }
    });

    const aiContent = completion.choices[0].message.content;
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(aiContent);
    } catch (e) {
        console.error("Erreur parsing réponse IA", aiContent);
        parsedResponse = { text: aiContent, newScene: false };
    }

    let imageUrl = null;

    // 3. Génération d'image DÉSACTIVÉE
    /*
    if (parsedResponse.newScene && parsedResponse.imagePrompt) {
       // ...
    }
    */

    // 4. Génération Audio (TTS)
    let audioContent = null;
    try {
        const mp3 = await client.audio.speech.create({
            model: "tts-1-hd",
            voice: "onyx",
            speed: 0.9, // Ralentir un peu pour l'effet "vieux conteur"
            input: parsedResponse.text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        audioContent = buffer.toString('base64');
    } catch (ttsError) {
        console.error("Erreur TTS:", ttsError);
    }

    // Nettoyage
    fs.unlinkSync(req.file.path);

    res.json({
      userText: userText,
      aiResponse: parsedResponse.text,
      imageUrl: imageUrl,
      audio: audioContent, // Renvoie l'audio en base64
      newSummary: newSummary,
      characterSheet: parsedResponse.characterSheet,
      diceRoll: parsedResponse.diceRoll || null
    });

  } catch (error) {
    console.error("Erreur OpenAI:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Erreur traitement", details: error.message });
  }
};
