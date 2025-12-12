-- Migration: Add missing columns to existing tables
-- This migration adds chapter_id to campaign_messages and audio_enabled to campaigns

-- Add chapter_id column to campaign_messages if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaign_messages' AND column_name = 'chapter_id'
    ) THEN
        ALTER TABLE campaign_messages 
        ADD COLUMN chapter_id INTEGER REFERENCES campaign_chapters(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add audio_enabled column to campaigns if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'campaigns' AND column_name = 'audio_enabled'
    ) THEN
        ALTER TABLE campaigns 
        ADD COLUMN audio_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

