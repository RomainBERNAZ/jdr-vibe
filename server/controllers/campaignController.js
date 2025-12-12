import pool from '../config/db.js';
import { generateChapterSummary } from '../services/openaiService.js';

export const getCampaigns = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC', 
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
    
    const campaign = result.rows[0];
    
    const playersResult = await pool.query(
      `SELECT u.id, u.email, cp.character_name, cp.joined_at 
       FROM campaign_players cp 
       JOIN users u ON cp.user_id = u.id 
       WHERE cp.campaign_id = $1`,
      [id]
    );

    // Charger les chapitres archivés
    const chaptersResult = await pool.query(
      'SELECT * FROM campaign_chapters WHERE campaign_id = $1 ORDER BY created_at ASC',
      [id]
    );

    // Charger uniquement les messages du chapitre actif (non archivés)
    const activeMessagesResult = await pool.query(
      'SELECT * FROM campaign_messages WHERE campaign_id = $1 AND chapter_id IS NULL ORDER BY created_at ASC',
      [id]
    );
    
    res.json({ 
        ...campaign, 
        players: playersResult.rows, 
        history: activeMessagesResult.rows,
        chapters: chaptersResult.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createCampaign = async (req, res) => {
  try {
    const { name, system, audio_enabled } = req.body;
    const result = await pool.query(
      'INSERT INTO campaigns (name, system, user_id, status, audio_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, system, req.user.id, 'pending', audio_enabled !== undefined ? audio_enabled : true]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }
    const { name, system, description, status } = req.body;
    
    const check = await pool.query('SELECT user_id FROM campaigns WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Not found" });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const result = await pool.query(
      `UPDATE campaigns 
       SET name = COALESCE($1, name), 
           system = COALESCE($2, system), 
           description = COALESCE($3, description),
           status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [name, system, description, status, id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }
    
    // Check ownership
    const check = await pool.query('SELECT user_id FROM campaigns WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Not found" });
    if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    res.json({ message: "Campagne supprimée avec succès" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const addPlayer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: "Invalid campaign ID" });
    }
    const { email } = req.body;

    const campRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (campRes.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
    
    const campaign = campRes.rows[0];
    if (campaign.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    
    if (campaign.status !== 'pending') {
      return res.status(400).json({ error: "Cannot add players to a started campaign" });
    }

    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const newPlayerId = userRes.rows[0].id;

    await pool.query(
      'INSERT INTO campaign_players (campaign_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, newPlayerId]
    );

    const playersResult = await pool.query(
      `SELECT u.id, u.email, cp.character_name, cp.joined_at 
       FROM campaign_players cp 
       JOIN users u ON cp.user_id = u.id 
       WHERE cp.campaign_id = $1`,
      [id]
    );
    
    res.json(playersResult.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const closeChapter = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id === 'undefined') {
            return res.status(400).json({ error: "Invalid campaign ID" });
        }
        
        // Check ownership
        const check = await pool.query('SELECT user_id FROM campaigns WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Not found" });
        if (check.rows[0].user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        // 1. Get current messages (chapter_id IS NULL)
        const messagesRes = await pool.query(
            'SELECT role, content FROM campaign_messages WHERE campaign_id = $1 AND chapter_id IS NULL ORDER BY created_at ASC',
            [id]
        );
        const messages = messagesRes.rows;
        
        if (messages.length === 0) return res.status(400).json({ error: "Aucun message à archiver. Jouez d'abord !" });

        // 2. Generate Summary via OpenAI
        let chapterData;
        try {
            chapterData = await generateChapterSummary(messages);
        } catch (err) {
            console.error("OpenAI Error:", err);
            return res.status(500).json({ error: "Erreur lors de la génération du résumé." });
        }
        
        const { title, summary } = chapterData;

        // 3. Create Chapter
        const chapterRes = await pool.query(
            'INSERT INTO campaign_chapters (campaign_id, title, summary) VALUES ($1, $2, $3) RETURNING *',
            [id, title, summary]
        );
        const chapter = chapterRes.rows[0];

        // 4. Update messages to archive them
        await pool.query(
            'UPDATE campaign_messages SET chapter_id = $1 WHERE campaign_id = $2 AND chapter_id IS NULL',
            [chapter.id, id]
        );

        res.json({ message: "Chapitre clôturé avec succès", chapter });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};
