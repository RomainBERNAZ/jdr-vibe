import pool from '../config/db.js';
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

    let userText = "";

    // 1. Transcription (Whisper) ou Récupération Texte
    if (req.file) {
        const transcription = await client.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: "whisper-1",
            language: "fr",
        });
        userText = transcription.text;
    } else if (req.body.text) {
        userText = req.body.text;
    } else {
        return res.status(400).json({ error: "Aucune entrée (audio ou texte) fournie" });
    }

    const { campaignId, enableAudio } = req.body; // enableAudio is string 'true'/'false' in FormData

    // Save User Message
    if (campaignId) {
        await pool.query(
            'INSERT INTO campaign_messages (campaign_id, role, content) VALUES ($1, $2, $3)',
            [campaignId, 'user', userText]
        );
    }
    
    // Récupération du résumé, de l'historique et de la fiche de personnage
    let history = [];
    let summary = "";
    let characterSheet = null;
    let gameState = null; // New: Game State Persistence
    
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

    if (req.body.gameState) {
        try {
            gameState = JSON.parse(req.body.gameState);
        } catch (e) {
            console.error("Erreur parsing gameState:", e);
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
Tu es le Gardien de l'Aether, un Maître du Jeu (MJ) expert en D&D 5e, ancien et mystérieux.
Ta mission est de gérer une partie de jeu de rôle immersive, avec une rigueur mécanique cachée derrière une narration théâtrale.

MÉMOIRE DU JEU :
"${newSummary}"

ÉTAT DU JEU (COMBAT/SCÈNE) :
${gameState ? JSON.stringify(gameState) : "Aucun état actif."}

FICHE DE PERSONNAGE ACTUELLE :
${characterSheet ? JSON.stringify(characterSheet) : "Aucun personnage créé."}

INSTRUCTIONS DE GESTION DU JEU (MÉCANIQUES) :
1. COMBAT & STATS : Tu es le moteur du jeu.
   - Si un combat se lance, initialise un 'gameState' avec les PV et l'AC des monstres.
   - À chaque tour, mets à jour ce 'gameState' en fonction des dégâts.
   - NE DÉCIDE PAS DU RÉSULTAT D'UNE ACTION INCERTAINE SEUL. Demande un jet de dés.

2. SYSTÈME DE DÉS (CRITIQUE) :
   - Si le joueur tente une action risquée (attaquer, persuader, escalader...), DEMANDE UN JET via le champ 'diceRequest'.
   - Si le joueur te fournit un résultat de dé (ex: "J'ai fait 15"), utilise-le pour narrer la réussite ou l'échec par rapport à la difficulté (DC) que tu as fixée.
   - Exemple : Joueur "J'attaque !" -> Toi : (JSON avec diceRequest: d20) "Dégaine ton arme ! Fais un jet d'attaque."

3. INVENTAIRE & LOOT :
   - Sois GÉNÉREUX mais RÉALISTE sur le butin.
   - Si le joueur trouve un objet, AJOUTE-LE explicitement à 'characterSheet.inventory'.
   - Si le joueur utilise/perd un objet, RETIRE-LE de 'characterSheet.inventory'.
   - Gère l'or (gold) de la même façon.
   - Mets à jour les stats (PV) dans 'characterSheet' si le joueur est blessé ou soigné.

4. REPRISE DE JEU & META :
   - Si le message utilisateur commence par "[SYSTÈME]", c'est une instruction interne (début de chapitre, auto-roll...). Traite-la comme une didascalie.
   - Pour un début de chapitre (avec résumé disponible), commence par un style "Précédemment..." immersif, rappelle les enjeux majeurs, puis décris la situation actuelle pour redonner la main au joueur immédiatement.

FORMAT DE SORTIE (JSON UNIQUEMENT) :
{
  "text": "Ta narration. Théâtrale, immersive. Si tu demandes un jet, décris l'action en suspens.",
  "newScene": boolean, // true si changement majeur de lieu
  "characterSheet": { ... }, // Fiche mise à jour IMPÉRATIVEMENT si changement (PV, Inventaire, Gold...)
  "diceRequest": { // OPTIONNEL : Uniquement si tu as besoin d'un jet maintenant
      "type": "d20", // ou "d6", "d100", "2d6"...
      "stat": "force", // Label pour le joueur
      "difficulty": 15 // DC secrète
  },
  "gameState": { // OPTIONNEL : Pour te souvenir des choses au prochain tour (HP monstres, etc.)
     "inCombat": boolean,
     "enemies": [ { "name": "Gobelin", "hp": 5, "ac": 12 } ] 
  }
}

TON STYLE :
- Ton : Vieux conteur, voix grave, phrases évocatrices.
- Si le joueur rate un jet, narre un échec intéressant (fail forward).
- N'hésite pas à être cruel si les dés sont mauvais.
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

    // Save AI Message
    if (campaignId && parsedResponse.text) {
        await pool.query(
            'INSERT INTO campaign_messages (campaign_id, role, content) VALUES ($1, $2, $3)',
            [campaignId, 'assistant', parsedResponse.text]
        );
    }

    let imageUrl = null;

    // 3. Génération d'image DÉSACTIVÉE
    /*
    if (parsedResponse.newScene && parsedResponse.imagePrompt) {
       // ...
    }
    */

    // 4. Génération Audio (TTS) - Optionnelle
    let audioContent = null;
    const isAudioEnabled = enableAudio === 'true' || enableAudio === true; // Handle potential boolean or string
    
    if (isAudioEnabled) {
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
    }

    // Nettoyage
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }

    res.json({
      userText: userText,
      aiResponse: parsedResponse.text,
      imageUrl: imageUrl,
      audio: audioContent, // Renvoie l'audio en base64 ou null
      newSummary: newSummary,
      characterSheet: parsedResponse.characterSheet,
      diceRequest: parsedResponse.diceRequest || null, // New field
      gameState: parsedResponse.gameState || null // New field
    });

  } catch (error) {
    console.error("Erreur OpenAI:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Erreur traitement", details: error.message });
  }
};
