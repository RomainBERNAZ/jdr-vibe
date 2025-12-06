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

    // 2. Prompt Système amélioré
    const systemPrompt = `
CONTEXTE ET RÔLE :
Tu es un Maître du Jeu expert en narration vivante, improvisation, et gestion d’univers médiéval fantastique.
Ta mission est de créer un univers unique, gérer les règles narrativement, faire évoluer l’histoire selon les choix du joueur, et le plonger dans une aventure immersive (Ambiance Dark-Fantasy).

MÉMOIRE DU JEU (RÉSUMÉ DES ÉPISODES PRÉCÉDENTS) :
"${newSummary}"

FICHE DE PERSONNAGE ACTUELLE (Joueur) :
${characterSheet ? JSON.stringify(characterSheet) : "Aucun personnage créé pour le moment. Crée-le avec le joueur."}

RÈGLES DE SORTIE (CRITIQUE) :
Tu dois répondre UNIQUEMENT en format JSON valide. Ne mets pas de markdown autour.
Structure JSON attendue :
{
  "text": "Ta réponse narrative au joueur ici. Utilise des descriptions sensorielles (sons, odeurs, sensations), incarne les PNJ, propose des choix. Si l'action est risquée, simule un jet de dé narrativement.",
  "newScene": boolean,
  "imagePrompt": "Description visuelle courte en anglais pour DALL-E",
  "characterSheet": {
      // Renvoie TOUJOURS l'objet complet, même s'il ne change pas.
      // Mets à jour les PV, l'or, l'inventaire et les stats selon les événements.
      "name": "Nom du perso",
      "race": "Race",
      "class": "Classe",
      "level": 1,
      "hp": { "current": 10, "max": 10 },
      "gold": 0,
      "inventory": ["Item 1", "Item 2"],
      "stats": { "force": 10, "dexterite": 10, "intelligence": 10, "charisme": 10 }
  },
  "diceRoll": { "type": "d20", "count": 1 } // Optionnel : inclure uniquement si une action nécessite un jet (combat, compétence, chance). Type: "d6", "d20", "d100".
}

TON STYLE :
- Ambiance Dark-Fantasy mais avec moments d’espoir.
- Univers vivant, brutal et poétique.
- Narration immersive, caméra en main.
- Toujours laisser un choix au joueur à la fin.
- N’utilise pas de listes à puces dans le texte narratif, raconte comme un roman.
- Si c'est le début, propose 3 accroches scénaristiques.
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

    // 3. Génération d'image DÉSACTIVÉE pour optimiser les coûts et privilégier l'intelligence du texte
    /*
    if (parsedResponse.newScene && parsedResponse.imagePrompt) {
        try {
            const image = await client.images.generate({
                model: "dall-e-3",
                prompt: `Fantasy oil painting, detailed, atmospheric, dark medieval fantasy style like D&D artwork. ${parsedResponse.imagePrompt}`,
                n: 1,
                size: "1024x1024",
            });
            imageUrl = image.data[0].url;
        } catch (imgError) {
            console.error("Erreur génération image:", imgError);
            // On continue sans image si ça plante
        }
    }
    */

    // Nettoyage
    fs.unlinkSync(req.file.path);

    res.json({
      userText: userText,
      aiResponse: parsedResponse.text,
      imageUrl: imageUrl,
      newSummary: newSummary,
      characterSheet: parsedResponse.characterSheet, // Retourne la fiche mise à jour
      diceRoll: parsedResponse.diceRoll || null // Transmet la demande de jet de dé
    });

  } catch (error) {
    console.error("Erreur OpenAI:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Erreur traitement", details: error.message });
  }
};
