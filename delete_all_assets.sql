-- Script pour supprimer tous les assets de la base de données
-- ATTENTION : Cette action est irréversible !

-- Supprimer tous les assets
DELETE FROM assets;

-- Vérifier qu'il n'en reste plus
SELECT COUNT(*) as remaining_assets FROM assets;

