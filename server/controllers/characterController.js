import pool from '../config/db.js';

export const createCharacter = async (req, res) => {
  try {
    const { name, race, class: charClass, stats, backstory } = req.body;
    const userId = req.user.id;

    // Valeurs par défaut basiques
    const defaultStats = stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const defaultHp = 10 + Math.floor((defaultStats.con - 10) / 2);

    const result = await pool.query(
      `INSERT INTO characters 
       (user_id, name, race, class, level, stats, hp_current, hp_max, backstory) 
       VALUES ($1, $2, $3, $4, 1, $5, $6, $6, $7) 
       RETURNING *`,
      [userId, name, race, charClass, JSON.stringify(defaultStats), defaultHp, backstory]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCharacters = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query('SELECT * FROM characters WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Personnage non trouvé" });
    
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const updateCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body; // { hp_current, gold, inventory, stats, etc. }

    // Construction dynamique de la requête UPDATE
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      if (['name', 'race', 'class', 'level', 'stats', 'inventory', 'hp_current', 'hp_max', 'gold', 'backstory', 'campaign_id'].includes(key)) {
        fields.push(`${key} = $${idx}`);
        values.push(key === 'stats' || key === 'inventory' ? JSON.stringify(updates[key]) : updates[key]);
        idx++;
      }
    }

    if (fields.length === 0) return res.json({ message: "Rien à mettre à jour" });

    values.push(id, userId);
    const query = `UPDATE characters SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx+1} RETURNING *`;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) return res.status(404).json({ error: "Personnage non trouvé ou non autorisé" });

    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = await pool.query('DELETE FROM characters WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Personnage non trouvé" });
    res.json({ message: "Personnage supprimé" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

