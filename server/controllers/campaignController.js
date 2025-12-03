import pool from '../config/db.js';

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

export const createCampaign = async (req, res) => {
  try {
    const { name, system } = req.body;
    const result = await pool.query(
      'INSERT INTO campaigns (name, system, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, system, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

