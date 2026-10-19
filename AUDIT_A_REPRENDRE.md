# Revue technique : suivi

Revue mise a jour le 19 octobre 2026. `npm test` passe (35 tests), le build passe, et `npm audit` ne signale aucune vulnerabilite connue.

## Corrige

- Mise a niveau vers Vite 8 et Tailwind 4; les dependances frontend et de build sont en `devDependencies`, `form-data` et Nodemon inutilises ont ete retires, et `npm ci` est utilise dans Docker.
- L'authentification valide et normalise les entrees, limite les tentatives, renvoie une erreur de connexion generique et emet un JWT de 7 jours dans un cookie HttpOnly/SameSite Strict. Le JWT n'est plus expose au JavaScript ni stocke dans `localStorage`.
- CORS est limite a une liste d'origines, les routes mutantes verifient l'origine, PostgreSQL verifie les certificats TLS, et le port local de la base est lie a localhost.
- Les campagnes invitees apparaissent au tableau de bord; l'edition reste reservee au proprietaire. Les sessions (conversation, resume et personnage) sont persistees par campagne et utilisateur.
- Les corps de requete sont valides, les erreurs HTTP sont normalisees, et les migrations ont un journal versionne, une transaction et un verrou consultatif.
- La route vocale est authentifiee, limitee en debit et en taille; les fichiers temporaires sont purges au demarrage puis toutes les heures apres 24 h.
- Les boucles RAF, observateurs de taille et ressources Three.js sont nettoyes; les des calculent et affichent un resultat borne.
- Les pages sont chargees a la demande : le chunk d'entree mesure environ 185 kB minifie. Three.js reste dans un chunk paresseux d'environ 507 kB.
- Un endpoint `/api/health` et un arret propre du serveur et du pool PostgreSQL sont en place.

Avant Compose, creer `.env` depuis `.env.example`, generer `POSTGRES_PASSWORD` et un `JWT_SECRET` aleatoire d'au moins 32 octets, puis renseigner `OPENAI_API_KEY`. En production, definir `CORS_ORIGINS`, fournir `DATABASE_SSL_CA_FILE` si la base utilise une CA privee, et configurer `TRUST_PROXY_HOPS` uniquement selon le nombre exact de proxies fiables. Ne pas committer `.env`.

## A reprendre

- Ajouter des tests d'integration contre une vraie base PostgreSQL et des tests frontend de parcours. Les tests actuels utilisent une base simulee; Docker et PostgreSQL ne sont pas disponibles dans l'environnement de validation.
- Le limiteur utilise le stockage memoire par processus. Ajouter un magasin partage (par exemple Redis) avant de lancer plusieurs instances; derriere un proxy, configurer `TRUST_PROXY_HOPS` correctement.
- Evaluer `gpt-4o-mini-transcribe` sur des extraits francais representatifs avant de remplacer `whisper-1`. Le tarif officiel consulte etait de $0.003/min contre $0.006/min, mais le changement de modele n'a pas ete applique ni benchmarke.
- Le chunk Three.js paresseux (~507 kB minifie) depasse encore le seuil d'avertissement Vite; l'entree initiale est toutefois reduite a ~185 kB.
- Les sessions conservent les 200 derniers messages; une pagination ou un archivage des conversations plus longues reste a definir.