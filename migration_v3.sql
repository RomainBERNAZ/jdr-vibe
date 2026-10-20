CREATE TABLE IF NOT EXISTS campaign_turns (
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    turn_id UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, user_id, turn_id),
    FOREIGN KEY (campaign_id, user_id)
        REFERENCES campaign_sessions(campaign_id, user_id)
        ON DELETE CASCADE
);
