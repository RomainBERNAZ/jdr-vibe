CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    system VARCHAR(100) DEFAULT 'D&D 5e',
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL, -- Peut être NULL si pas encore assigné
    name VARCHAR(255) NOT NULL,
    race VARCHAR(100),
    class VARCHAR(100),
    level INTEGER DEFAULT 1,
    stats JSONB DEFAULT '{}', -- Force, Dex, etc.
    inventory JSONB DEFAULT '[]', -- Liste d'objets
    hp_current INTEGER DEFAULT 10,
    hp_max INTEGER DEFAULT 10,
    gold INTEGER DEFAULT 0,
    backstory TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_players (
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL, -- Lien vers le personnage utilisé
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, user_id)
);
