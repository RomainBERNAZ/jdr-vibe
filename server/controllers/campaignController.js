import pool from '../config/db.js';

const isOwner = (ownerId, userId) => Number(ownerId) === Number(userId);

const canAccessCampaign = async (database, campaignId, userId, ownerId) => {
  if (isOwner(ownerId, userId)) return true;
  const membership = await database.query(
    'SELECT 1 FROM campaign_players WHERE campaign_id = $1 AND user_id = $2',
    [campaignId, userId]
  );
  return membership.rows.length > 0;
};

const sendDatabaseError = (res, message, error) => {
  console.error(message, error);
  res.status(500).json({ error: 'Internal server error' });
};

export const getCampaigns = async (req, res, database = pool) => {
  try {
    const result = await database.query(
      `SELECT DISTINCT c.*, (c.user_id = $1) AS is_owner
       FROM campaigns c
       LEFT JOIN campaign_players cp ON cp.campaign_id = c.id AND cp.user_id = $1
       WHERE c.user_id = $1 OR cp.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    sendDatabaseError(res, 'Unable to list campaigns:', error);
  }
};

export const getCampaign = async (req, res, database = pool) => {
  try {
    const { id } = req.params;
    const result = await database.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
    
    const campaign = result.rows[0];

    if (!await canAccessCampaign(database, id, req.user.id, campaign.user_id)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    const playersResult = await database.query(
      `SELECT u.id, u.email, cp.character_name, cp.joined_at 
       FROM campaign_players cp 
       JOIN users u ON cp.user_id = u.id 
       WHERE cp.campaign_id = $1`,
      [id]
    );
    
    res.json({ ...campaign, is_owner: isOwner(campaign.user_id, req.user.id), players: playersResult.rows });
  } catch (error) {
    sendDatabaseError(res, 'Unable to get campaign:', error);
  }
};

export const createCampaign = async (req, res, database = pool) => {
  try {
    const { name, system, description } = req.body;
    const result = await database.query(
      `INSERT INTO campaigns (name, system, description, user_id, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, system, description ?? null, req.user.id, 'pending']
    );
    res.status(201).json({ ...result.rows[0], is_owner: true });
  } catch (error) {
    sendDatabaseError(res, 'Unable to create campaign:', error);
  }
};

export const updateCampaign = async (req, res, database = pool) => {
  try {
    const { id } = req.params;
    const { name, system, description, status } = req.body;
    
    // Check ownership
    const check = await database.query('SELECT user_id FROM campaigns WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Not found" });
    if (!isOwner(check.rows[0].user_id, req.user.id)) return res.status(403).json({ error: "Unauthorized" });

    const result = await database.query(
      `UPDATE campaigns 
       SET name = COALESCE($1, name), 
           system = COALESCE($2, system), 
           description = COALESCE($3, description),
           status = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [name, system, description, status, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    sendDatabaseError(res, 'Unable to update campaign:', error);
  }
};

export const addPlayer = async (req, res, database = pool) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    // Check campaign status and ownership
    const campRes = await database.query('SELECT * FROM campaigns WHERE id = $1', [id]);
    if (campRes.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
    
    const campaign = campRes.rows[0];
    if (!isOwner(campaign.user_id, req.user.id)) return res.status(403).json({ error: "Unauthorized" });
    
    if (campaign.status !== 'pending') {
      return res.status(400).json({ error: "Cannot add players to a started campaign" });
    }

    // Find user
    const userRes = await database.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    
    const newPlayerId = userRes.rows[0].id;

    // Add to campaign_players
    await database.query(
      'INSERT INTO campaign_players (campaign_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, newPlayerId]
    );

    // Return updated player list
    const playersResult = await database.query(
      `SELECT u.id, u.email, cp.character_name, cp.joined_at 
       FROM campaign_players cp 
       JOIN users u ON cp.user_id = u.id 
       WHERE cp.campaign_id = $1`,
      [id]
    );
    
    res.json(playersResult.rows);
  } catch (error) {
    sendDatabaseError(res, 'Unable to add campaign player:', error);
  }
};

export const getCampaignSession = async (req, res, database = pool) => {
  try {
    const { id } = req.params;
    const campaignResult = await database.query('SELECT id, user_id FROM campaigns WHERE id = $1', [id]);
    if (campaignResult.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    const campaign = campaignResult.rows[0];
    if (!await canAccessCampaign(database, id, req.user.id, campaign.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await database.query(
      'SELECT conversation, summary, character_sheet FROM campaign_sessions WHERE campaign_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    res.json(result.rows[0] ?? { conversation: [], summary: '', character_sheet: null });
  } catch (error) {
    sendDatabaseError(res, 'Unable to load campaign session:', error);
  }
};

export const saveCampaignSession = async (req, res, database = pool) => {
  try {
    const { id } = req.params;
    const campaignResult = await database.query('SELECT id, user_id FROM campaigns WHERE id = $1', [id]);
    if (campaignResult.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });

    const campaign = campaignResult.rows[0];
    if (!await canAccessCampaign(database, id, req.user.id, campaign.user_id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { conversation, summary, characterSheet } = req.body;
    const result = await database.query(
      `INSERT INTO campaign_sessions (campaign_id, user_id, conversation, summary, character_sheet, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (campaign_id, user_id) DO UPDATE SET
         conversation = EXCLUDED.conversation,
         summary = EXCLUDED.summary,
         character_sheet = EXCLUDED.character_sheet,
         updated_at = CURRENT_TIMESTAMP
       RETURNING conversation, summary, character_sheet, updated_at`,
      [id, req.user.id, JSON.stringify(conversation), summary, characterSheet === null ? null : JSON.stringify(characterSheet)]
    );
    res.json(result.rows[0]);
  } catch (error) {
    sendDatabaseError(res, 'Unable to save campaign session:', error);
  }
};
