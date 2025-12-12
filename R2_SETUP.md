# Configuration Cloudflare R2

Ce guide vous explique comment configurer Cloudflare R2 pour stocker les fichiers audio de l'application.

## 📋 Prérequis

1. Un compte Cloudflare (gratuit)
2. Un bucket R2 créé dans votre compte Cloudflare

## 🔑 Où mettre vos clés API

### Option 1 : Fichier `.env` (Recommandé - Fonctionne pour local ET Docker)

Créez un fichier `.env` à la racine du projet (copiez `env.template` et renommez-le) avec le contenu suivant :

```env
R2_ACCESS_KEY_ID=votre_access_key_id
R2_SECRET_ACCESS_KEY=votre_secret_access_key
R2_ENDPOINT=https://votre_account_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=nom_de_votre_bucket
```

**⚠️ Important :** Le fichier `.env` est dans `.gitignore` et ne sera pas commité. Ne partagez jamais vos clés API publiquement.

### Option 2 : Fichier `.env` (Recommandé pour Docker)

Le fichier `docker-compose.yml` est configuré pour charger automatiquement les variables du fichier `.env`. Il vous suffit donc de :

1. Créer un fichier `.env` à la racine du projet (copiez `env.template`)
2. Ajouter toutes vos variables d'environnement, y compris R2 :

```env
# ... autres variables
R2_ACCESS_KEY_ID=votre_access_key_id
R2_SECRET_ACCESS_KEY=votre_secret_access_key
R2_ENDPOINT=https://votre_account_id.r2.cloudflarestorage.com
R2_BUCKET_NAME=nom_de_votre_bucket
```

Les variables seront automatiquement chargées par Docker Compose.

### Option 3 : Variables d'environnement Railway/Production

Si vous déployez sur Railway ou un autre service :

1. Allez dans les paramètres de votre projet
2. Section "Variables" ou "Environment Variables"
3. Ajoutez les 4 variables suivantes :
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_ENDPOINT`
   - `R2_BUCKET_NAME`

## 📝 Comment obtenir vos clés R2

### Étape 1 : Créer un bucket R2

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sélectionnez votre compte
3. Dans le menu de gauche, cliquez sur **R2**
4. Cliquez sur **Create bucket**
5. Donnez un nom à votre bucket (ex: `jdr-audio-files`)
6. Choisissez une localisation (recommandé : proche de vos utilisateurs)
7. Cliquez sur **Create bucket**

### Étape 2 : Créer un token API

1. Dans R2, cliquez sur **Manage R2 API Tokens**
2. Cliquez sur **Create API token**
3. Donnez un nom descriptif (ex: "JDR App Token")
4. **Permissions** : Sélectionnez **Object Read & Write**
5. **TTL** : Laissez par défaut ou définissez une expiration
6. Cliquez sur **Create API token**
7. **⚠️ IMPORTANT** : Copiez immédiatement :
   - **Access Key ID**
   - **Secret Access Key**
   
   Ces informations ne seront plus affichées après fermeture de la fenêtre !

### Étape 3 : Trouver votre Account ID et Endpoint

1. Dans le dashboard Cloudflare, regardez l'URL de votre navigateur
2. Vous verrez quelque chose comme : `https://dash.cloudflare.com/xxxxx/...`
3. Le `xxxxx` est votre **Account ID**
4. Votre endpoint sera : `https://xxxxx.r2.cloudflarestorage.com`

Ou bien :
1. Allez dans R2 > votre bucket
2. Dans les paramètres du bucket, vous trouverez l'endpoint complet

### Étape 4 : Configurer les permissions du bucket (Optionnel)

Par défaut, les fichiers sont privés. Pour les rendre publics :

1. Allez dans votre bucket R2
2. Cliquez sur **Settings**
3. Dans **Public Access**, activez **Allow Access**
4. (Optionnel) Configurez un domaine personnalisé si vous en avez un

Si vous configurez un domaine personnalisé, ajoutez aussi dans `.env` :
```env
R2_PUBLIC_URL=https://votre-domaine-personnalise.com
```

## ✅ Vérification

Une fois configuré, redémarrez votre application. Lors d'un upload audio, vous devriez voir dans les logs :

```
✅ Fichier uploadé vers R2: campaigns/123/audio/1234567890-audio-1234567890.mp3
📤 Audio uploadé vers R2: https://...
```

## 🔒 Sécurité

- **Ne commitez jamais** vos clés API dans Git
- Utilisez des tokens avec des permissions minimales nécessaires
- En production, utilisez les variables d'environnement du service de déploiement
- Si un token est compromis, supprimez-le immédiatement et créez-en un nouveau

## 🐛 Dépannage

### Erreur : "Configuration R2 manquante"
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez l'orthographe des noms de variables (ils doivent être exactement comme dans `.env.example`)

### Erreur : "Access Denied"
- Vérifiez que votre token a les permissions "Object Read & Write"
- Vérifiez que le nom du bucket est correct

### Erreur : "Invalid endpoint"
- Vérifiez que votre Account ID est correct dans l'endpoint
- L'endpoint doit être au format : `https://<account-id>.r2.cloudflarestorage.com`

### Les fichiers ne sont pas publics
- Activez "Public Access" dans les paramètres du bucket
- Ou configurez un domaine personnalisé avec Cloudflare

