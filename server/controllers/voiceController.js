import OpenAI from 'openai';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import pool from '../config/db.js';
import { canAccessCampaign } from '../utils/campaignAccess.js';
import { narrativeResponseSchema, voiceTurnSchema } from '../validation/schemas.js';

let openai;

const initOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

export const cleanupUploadedAudio = (filePath) => {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Erreur suppression audio temporaire:', error);
  }
};

const hashUploadedAudio = async (filePath) => {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
};

const loadCampaignSession = async (client, campaignId, userId) => {
  const result = await client.query(
    'SELECT conversation, summary, character_sheet FROM campaign_sessions WHERE campaign_id = $1 AND user_id = $2',
    [campaignId, userId]
  );
  return result.rows[0] ?? { conversation: [], summary: '', character_sheet: null };
};

const serializeVoiceResponse = (turnResponse, session) => ({
  ...turnResponse,
  newSummary: session.summary,
  characterSheet: session.character_sheet,
  conversation: session.conversation
});

const systemPromptFor = (summary, characterSheet) => `
CONTEXTE ET RÔLE :
Tu es un Maître du Jeu expert en narration vivante, improvisation, et gestion d’univers médiéval fantastique.
Ta mission est de créer un univers unique, gérer les règles narrativement, faire évoluer l’histoire selon les choix du joueur, et le plonger dans une aventure immersive (Ambiance Dark-Fantasy).

MÉMOIRE DU JEU (RÉSUMÉ DES ÉPISODES PRÉCÉDENTS) :
"${summary}"

FICHE DE PERSONNAGE ACTUELLE (Joueur) :
${characterSheet ? JSON.stringify(characterSheet) : "Aucun personnage créé pour le moment. Crée-le avec le joueur."}

RÈGLES DE SORTIE (CRITIQUE) :
Tu dois répondre UNIQUEMENT en format JSON valide. Ne mets pas de markdown autour.
Renvoie toujours la fiche complète dans "characterSheet", même si elle ne change pas.
Mets à jour les PV, l'or, l'inventaire et les statistiques selon les événements.
Inclue "diceRoll" uniquement si une action nécessite un jet; utilise d6, d20 ou d100.
Structure JSON attendue :
{
  "text": "Ta réponse narrative au joueur ici. Utilise des descriptions sensorielles (sons, odeurs, sensations), incarne les PNJ, propose des choix. Si l'action est risquée, simule un jet de dé narrativement.",
  "newScene": boolean,
  "imagePrompt": "Description visuelle courte en anglais pour DALL-E",
  "characterSheet": {
      "name": "Nom du perso",
      "race": "Race",
      "class": "Classe",
      "level": 1,
      "hp": { "current": 10, "max": 10 },
      "gold": 0,
      "inventory": ["Item 1", "Item 2"],
      "stats": { "force": 10, "dexterite": 10, "intelligence": 10, "charisme": 10 }
  },
  "diceRoll": { "type": "d20", "count": 1 }
}

TON STYLE :
- Ambiance Dark-Fantasy mais avec moments d’espoir.
- Univers vivant, brutal et poétique.
- Narration immersive, caméra en main.
- Toujours laisser un choix au joueur à la fin.
- N’utilise pas de listes à puces dans le texte narratif, raconte comme un roman.
- Si c'est le début, propose 3 accroches scénaristiques.
`;

export const createTranscribeAndChat = ({
  database = pool,
  getOpenAIClient = initOpenAI
} = {}) => async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier audio fourni' });
  }

  let client;
  let lockAcquired = false;
  let clientReleaseError;
  let sessionLockKey;

  try {
    const requestValidation = voiceTurnSchema.safeParse(req.body ?? {});
    if (!requestValidation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: requestValidation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { campaignId, turnId } = requestValidation.data;
    const openAIClient = getOpenAIClient();
    if (!openAIClient) {
      return res.status(500).json({ error: "Clé API OpenAI manquante dans les variables d'environnement" });
    }

    client = typeof database.connect === 'function' ? await database.connect() : database;

    const campaignResult = await client.query(
      'SELECT id, user_id FROM campaigns WHERE id = $1',
      [campaignId]
    );
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (!await canAccessCampaign(client, campaignId, req.user.id, campaignResult.rows[0].user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const requestHash = await hashUploadedAudio(req.file.path);
    sessionLockKey = `campaign-session:${campaignId}:user:${req.user.id}`;
    await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [sessionLockKey]);
    lockAcquired = true;

    const existingTurnResult = await client.query(
      `SELECT request_hash, response
       FROM campaign_turns
       WHERE campaign_id = $1 AND user_id = $2 AND turn_id = $3`,
      [campaignId, req.user.id, turnId]
    );
    if (existingTurnResult.rows.length > 0) {
      const existingTurn = existingTurnResult.rows[0];
      if (existingTurn.request_hash !== requestHash) {
        return res.status(409).json({ error: 'Cet identifiant de tour a déjà été utilisé pour un autre enregistrement.' });
      }

      const session = await loadCampaignSession(client, campaignId, req.user.id);
      const turnResponse = typeof existingTurn.response === 'string'
        ? JSON.parse(existingTurn.response)
        : existingTurn.response;
      return res.json(serializeVoiceResponse(turnResponse, session));
    }

    const session = await loadCampaignSession(client, campaignId, req.user.id);
    const storedConversation = Array.isArray(session.conversation) ? session.conversation : [];
    const history = storedConversation
      .filter((message) => message?.type === 'user' || message?.type === 'ai')
      .slice(-10)
      .map((message) => ({
        role: message.type === 'user' ? 'user' : 'assistant',
        content: message.text
      }));
    const transcription = await openAIClient.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: 'whisper-1',
      language: 'fr'
    });
    const userText = transcription.text?.trim();
    if (!userText) {
      return res.status(422).json({ error: 'La transcription audio est vide. Réessayez.' });
    }
    if (userText.length > 4000) {
      return res.status(422).json({ error: 'La transcription est trop longue. Enregistrez un tour plus court.' });
    }

    let newSummary = session.summary;
    let activeHistory = history;
    if (history.length > 6) {
      const olderMessages = history.slice(0, -2);
      activeHistory = history.slice(-2);

      try {
        const summaryCompletion = await openAIClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: "Tu es un assistant archiviste de JDR. Résume les événements clés de ce dialogue pour les ajouter au journal de campagne. Sois concis et garde les noms propres, lieux et quêtes."
            },
            {
              role: 'user',
              content: `Résumé actuel: ${session.summary}\n\nNouveaux échanges à intégrer:\n${JSON.stringify(olderMessages)}`
            }
          ]
        });
        const candidateSummary = summaryCompletion.choices[0]?.message?.content;
        if (typeof candidateSummary !== 'string' || candidateSummary.length > 20000) {
          throw new Error('Le résumé généré est invalide ou trop long.');
        }
        newSummary = candidateSummary;
      } catch (error) {
        console.error('Erreur compression mémoire:', error);
      }
    }

    const completion = await openAIClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPromptFor(newSummary, session.character_sheet) },
        ...activeHistory,
        { role: 'user', content: userText }
      ],
      response_format: { type: 'json_object' }
    });

    const aiContent = completion.choices[0]?.message?.content;
    let responseData;
    try {
      responseData = JSON.parse(aiContent);
    } catch (error) {
      console.error('Erreur parsing réponse IA:', error);
      return res.status(502).json({ error: 'Réponse invalide du maître du jeu. Réessayez.' });
    }

    const validatedResponse = narrativeResponseSchema.safeParse(responseData);
    if (!validatedResponse.success) {
      console.error('Réponse IA rejetée:', validatedResponse.error.issues);
      return res.status(502).json({ error: 'Réponse invalide du maître du jeu. Réessayez.' });
    }

    const parsedResponse = validatedResponse.data;
    const nextCharacterSheet = parsedResponse.characterSheet ?? session.character_sheet;
    const nextConversation = [
      ...storedConversation,
      { type: 'user', text: userText },
      { type: 'ai', text: parsedResponse.text }
    ].slice(-200);
    const turnResponse = {
      userText,
      aiResponse: parsedResponse.text,
      imageUrl: null,
      diceRoll: parsedResponse.diceRoll || null
    };

    await client.query('BEGIN');
    let savedSession;
    try {
      const savedSessionResult = await client.query(
        `INSERT INTO campaign_sessions (campaign_id, user_id, conversation, summary, character_sheet, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (campaign_id, user_id) DO UPDATE SET
           conversation = EXCLUDED.conversation,
           summary = EXCLUDED.summary,
           character_sheet = EXCLUDED.character_sheet,
           updated_at = CURRENT_TIMESTAMP
         RETURNING conversation, summary, character_sheet`,
        [
          campaignId,
          req.user.id,
          JSON.stringify(nextConversation),
          newSummary,
          nextCharacterSheet === null ? null : JSON.stringify(nextCharacterSheet)
        ]
      );
      savedSession = savedSessionResult.rows[0];

      await client.query(
        `INSERT INTO campaign_turns (campaign_id, user_id, turn_id, request_hash, response)
         VALUES ($1, $2, $3, $4, $5)`,
        [campaignId, req.user.id, turnId, requestHash, JSON.stringify(turnResponse)]
      );
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Erreur rollback du tour vocal:', rollbackError);
      }
      throw error;
    }

    res.json(serializeVoiceResponse(turnResponse, savedSession));
  } catch (error) {
    console.error('Erreur traitement vocal:', error);
    res.status(500).json({ error: 'Impossible de traiter le tour. Réessayez.' });
  } finally {
    if (client && lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [
          sessionLockKey
        ]);
      } catch (error) {
        console.error('Erreur libération du verrou de session:', error);
        clientReleaseError = error;
      }
    }
    if (client && client !== database && typeof client.release === 'function') {
      client.release(clientReleaseError);
    }
    cleanupUploadedAudio(req.file?.path);
  }
};

export const transcribeAndChat = createTranscribeAndChat();
