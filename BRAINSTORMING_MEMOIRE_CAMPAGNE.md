# Brainstorming : memoire narrative par campagne

> Statut : proposition a faire evoluer. La session vocale est maintenant persistee cote serveur avec reprise idempotente; les entites, relations, connaissances et evenements restent a implementer.

## Etat de l'implementation

- Le tableau de bord sert de menu apres connexion; une partie ne s'affiche qu'apres l'ouverture d'une campagne.
- Le serveur recharge et sauvegarde la session du joueur a chaque tour vocal. Un identifiant de tour permet de rejouer une requete sans appliquer deux fois ses changements.
- La session reste actuellement propre a chaque joueur (`campaign_sessions`); la memoire partagee par campagne, les entites, les relations, les connaissances et la chronologie restent a construire.

## Intention

Donner a chaque campagne une memoire persistante de son propre univers. Les livres, personnages, lieux, objets, creatures, secrets et evenements sont crees ou importes dans une campagne, puis reutilises au fil de l'aventure. Pas de bestiaire ni de canon commun impose entre les campagnes.

L'objectif est de garder les faits coherents sans renvoyer tout l'historique a l'IA a chaque tour. L'IA reste responsable de la narration et de l'improvisation; la base devient la source de verite sur ce qui a deja ete etabli.

## Vision a long terme : jouer sans ecran

La destination du projet est une experience de campagne autour d'une table, sans telephone ni ordinateur visible. Un module physique integre un microphone et une enceinte pour ecouter les joueurs, faire avancer la partie et restituer la narration a voix haute. L'interface web actuelle sert de terrain d'essai et d'outil de preparation; elle ne doit pas devenir une dependance du moteur de campagne.

Le module devra rendre l'interaction claire sans interface visuelle :

- un bouton physique pour prendre/terminer la parole ou confirmer une action;
- une coupure micro physique, prioritaire sur le logiciel;
- un indicateur lumineux simple pour l'etat d'ecoute, de traitement et de micro coupe;
- un reglage de volume et des signaux audio courts pour les erreurs, attentes ou demandes de clarification;
- une prise en compte des interruptions, du bruit de table et des tours de parole.

La memoire de campagne doit donc vivre cote serveur et rester independante du terminal. Le module envoie des evenements vocaux et recoit des reponses audio; il ne possede pas la verite de la campagne. Le moteur de session doit pouvoir reprendre apres une deconnexion et ne jamais perdre un changement d'etat deja confirme.

Pour une table partageant une seule enceinte, la confidentialite est un sujet produit : une information connue d'un seul personnage ne doit pas etre lue a toute la table par accident. Il faudra choisir si les secrets sont toujours destines au groupe, si le joueur peut demander une sortie privee (ecouteur/telephone), ou si certaines informations restent simplement dans le journal jusqu'a ce qu'un joueur les consulte.

L'identite du joueur qui parle ne doit pas dependre obligatoirement d'une reconnaissance biometrique. Un bouton de tour, un nom dit a voix haute ou une confirmation explicite peuvent suffire au prototype. L'identification vocale automatique restera une option separee, avec des enjeux de consentement et de vie privee.

### Chemin de prototypage

1. Fiabiliser le tour vocal actuel dans l'application web, avec reprise apres erreur et etat de session persistant.
2. Tester un mode sans ecran sur un telephone ou un ordinateur cache : micro, enceinte, commandes vocales et signaux audio.
3. Faire un prototype de table avec un seul bouton de parole, mute physique, LED et volume; ne figer aucun choix de carte ou de boitier avant ces essais.
4. Tester avec plusieurs joueurs : bruit, interruptions, attribution de la parole, secrets, latence, comprehension et reprise apres coupure reseau.
5. Decider ensuite quelles fonctions doivent tourner localement et lesquelles peuvent dependre du cloud, ainsi que les mecanismes de mise a jour et de configuration du module.

La memoire d'entites, les relations, les connaissances et les evenements sont le fil rouge logiciel : ils permettent a la campagne de continuer sans que le terminal ait a garder l'historique complet en memoire.

## Principes

- **Tout est isole par campagne.** Les lectures et ecritures doivent toujours etre scopees par `campaign_id`; une campagne ne peut jamais voir les entites d'une autre.
- **Faits persistants, narration ephemere.** La base conserve les identites, relations, connaissances, possessions et evenements. L'IA choisit comment les raconter dans la scene.
- **Connaissance relative.** Un personnage peut ignorer un fait, en avoir entendu une rumeur, en connaitre la version publique ou detenir un secret. Les PNJ ont eux aussi leur propre niveau de connaissance.
- **Provenance.** Quand une information est apprise ou qu'une relation change, on garde une trace de l'evenement qui l'a etabli.
- **L'IA propose, le serveur valide.** Les changements d'etat passent par des schemas et des regles cote serveur; le modele ne peut pas inventer un identifiant ou appliquer des PV/degats hors limites.

## Entites de campagne

Une table `campaign_entities` pourrait representer tout ce qui a une identite dans le recit : personnage joueur, PNJ, livre, objet, creature, lieu, faction, quete, indice ou evenement nomme.

Champs conceptuels : `id`, `campaign_id`, `kind`, `canonical_name`, `aliases`, `summary`, `details JSONB`, `visibility`, `status`, `created_at`, `updated_at`. Le champ `details` varie selon le type et reste valide par un schema propre a ce type. `visibility` distingue ce qui est visible aux joueurs des notes reservees au maitre du jeu.

Une table `campaign_relations` relierait les entites : `from_entity_id`, `relation_type`, `to_entity_id`, `details`, `visibility` et eventuellement une periode de validite. Exemples de relations : `owns`, `knows`, `seeks`, `created`, `located_at`, `protects`, `hides`.

Une table `campaign_knowledge` expliciterait qui sait quoi : `knower_entity_id`, `known_entity_id`, `knowledge_level`, `known_facts JSONB`, `source_event_id`, `updated_at`. Une absence de ligne signifie que la connaissance n'a pas ete etablie. Niveaux possibles : `rumor`, `name`, `public_facts`, `detailed_knowledge`, `secret`.

Une table `campaign_inventory` relierait un personnage ou un conteneur a une entite de type objet : `holder_entity_id`, `item_entity_id`, `quantity`, `equipped`, `condition JSONB`. Les objets uniques, comme un livre ou une relique, restent des entites nommees; les objets empilables utilisent une quantite.

Une table `campaign_events` garderait la chronologie : `summary`, `occurred_at`, `visibility`, `source` et les references aux entites concernees. Elle permettrait de retrouver pourquoi un personnage sait quelque chose ou comment un objet a change de proprietaire.

Les tables actuelles `campaign_sessions` et `campaign_players` resteraient en place au debut. Il faudra decider si une campagne ne garde qu'un personnage par joueur ou si l'on ajoute une table `campaign_characters` avec un identifiant propre a chaque personnage.

## Memoire entre les rencontres

Une rencontre ne doit pas etre memorisee comme un long transcript. On conserve plutot trois couches complementaires :

1. **Etat courant du PNJ.** Son identite, ses objectifs, son statut et son dernier lieu connu restent dans l'entite et ses relations. Exemple : le marchand est vivant, se trouve probablement a Valbrume et cherche toujours le livre.
2. **Chronologie des faits importants.** Chaque interaction consequente ajoute un evenement immuable : premiere rencontre, promesse faite, dette, menace, objet montre ou secret revele. L'evenement garde l'heure fictionnelle et les entites impliquees. Une relation courante peut etre mise a jour, mais les evenements qui l'expliquent ne sont pas effaces.
3. **Memoire de chaque personnage.** `campaign_knowledge` indique ce que sait le PNJ, le personnage joueur ou eventuellement le groupe. Le savoir du PNJ et celui du joueur sont distincts : avoir parle du livre au marchand ne signifie pas que le marchand connait son contenu, ni que tous les personnages joueurs en ont entendu parler.

Il faut separer le temps reel de l'application et le temps fictionnel. Un evenement peut porter `created_at` (quand il a ete enregistre) et `occurred_at_game` (date ou moment dans l'univers). On peut ajouter a l'etat de campagne un temps fictionnel courant et une `current_location_id`. Si le jeu ne sait pas combien de temps s'est ecoule, il ne doit pas inventer que plusieurs semaines ont passe.

### Retrouvailles : exemple

Le groupe rencontre le marchand au debut de l'histoire. Les faits etablis sont : il s'appelle Orven, il a entendu une rumeur sur **Le Livre des Marees Noires**, il ne l'a jamais lu et il promet de chercher un contact. Le jeu enregistre le PNJ, l'entite livre, l'evenement de rencontre, la promesse et le niveau de connaissance d'Orven.

Quelques sessions plus tard, le groupe le retrouve. Le serveur recupere Orven, son dernier lieu connu, son objectif courant, sa relation avec chaque personnage, sa connaissance du livre et les evenements marquants depuis la derniere rencontre. Le prompt peut alors dire : « Orven se souvient de la promesse; il n'a pas lu le livre; les personnages ne savent pas encore s'il a trouve son contact. »

L'IA peut faire avancer la situation dans la scene, mais les faits nouveaux passent au serveur sous forme de changements explicites : « Orven a trouve le contact », « Orven révèle le nom », « relation avec le groupe devient méfiante ». Le serveur valide puis ajoute les evenements et met a jour les relations/connaissances correspondantes.

### Ce qu'on recharge au retour d'un PNJ

- L'entite du PNJ et son etat courant, pas sa fiche entiere si elle est volumineuse.
- Les relations avec le groupe et, si utile, chaque personnage joueur.
- Les connaissances du PNJ sur les sujets abordes et celles des personnages joueurs.
- Les derniers evenements lies a ce PNJ depuis la derniere rencontre, plus un petit resume durable des evenements plus anciens.
- Le temps fictionnel ecoule et le lieu actuel, uniquement si ces informations ont ete etablies.

On ne rejoue pas toutes les sessions passees dans le prompt. Les evenements anciens restent consultables dans PostgreSQL; un resume par entite et des index plein texte fournissent le contexte utile. Les dialogues bruts ne sont conserves que si une fonctionnalite le justifie; par defaut, on garde les faits, decisions et pistes ouvertes.

## Reputation et attitudes des PNJ

L'attitude d'un PNJ ne devrait pas dependre d'une seule jauge universelle « bon/mauvais ». Elle se calcule a partir de plusieurs signaux qui n'ont pas tous la meme portee :

- **Reputation du personnage.** Tendances observees dans ses actes, par exemple compassion/cruaute ou fiabilite/trahison.
- **Reputation locale.** Renommee connue dans une ville, une region ou une faction. Une action accomplie loin d'un groupe ne change pas automatiquement ce qu'il pense du personnage.
- **Relation personnelle.** Ce PNJ precis peut faire confiance au personnage, le craindre, le respecter, lui en vouloir ou lui etre attache.
- **Valeurs et temperament du PNJ.** Un garde, un marchand, un hors-la-loi et un chef de culte ne jugent pas les memes actes de la meme facon.
- **Situation presente.** Danger partage, dette, objectif commun, rivalite, pression politique ou interet du PNJ.

### Etat a conserver

Une table `campaign_reputations` pourrait conserver des scores par personnage et par portee (`global`, region ou faction), avec des axes limites et `updated_at`. Une table `campaign_relationships` pourrait conserver les dimensions de relation entre un PNJ et un personnage joueur : `trust`, `fear`, `respect`, `affinity`, resume de la relation et dernier evenement d'interaction.

Les valeurs numeriques restent internes. Une fonction deterministe cote serveur combine la relation individuelle, les reputations que le PNJ connait, ses valeurs et la situation pour obtenir une attitude lisible : `hostile`, `wary`, `neutral`, `open` ou `loyal`. Les traits du PNJ servent de poids : un garde reagit davantage a la fiabilite, tandis qu'un chef de bande peut respecter la force ou la ruse. La narration peut varier sans que l'IA decide seule des scores.

### Ce qu'un PNJ peut savoir

La reputation n'est pas omnisciente. Un acte ne modifie l'opinion que des temoins et des groupes qui en ont entendu parler. `campaign_knowledge` et les evenements peuvent indiquer qui connait le fait, sa source et son degre de certitude (`witnessed`, `reliable_report`, `rumor`). Les rumeurs peuvent se propager plus tard par une relation ou un evenement; elles ne teleportent pas instantanement l'information a toute la carte.

Un evenement important peut proposer une variation de reputation ou de relation. Le serveur verifie l'evenement, les temoins, la portee, les limites de score et les doublons avant de mettre a jour l'etat courant. Les actions insignifiantes ou repetees ne devraient pas faire farmer une jauge; les changements doivent etre proportionnels aux consequences et relies a un evenement source.

### Exemple

Un personnage sauve des habitants a Valbrume. Les habitants qui l'ont vu peuvent augmenter leur confiance et la reputation locale du personnage. Un marchand voisin peut en entendre une rumeur lors d'une rencontre ulterieure et devenir plus ouvert, sans connaitre chaque detail. Une faction ennemie, qui n'a pas eu vent de l'action, garde son opinion precedente. Un PNJ cruel peut meme respecter une action brutale qui aurait effraye un autre personnage.

Lors des retrouvailles, le serveur fournit au modele l'attitude calculee, ses causes connues et les evenements recents. Le modele joue alors l'attitude dans le dialogue et peut proposer des changements apres l'echange; le serveur reste responsable de leur validation et persistance.

## Exemple : le livre du marchand

Le marchand mentionne **Le Livre des Marees Noires**. La campagne cree une entite de type `book`, ajoute le marchand et le livre a la base, puis enregistre que le marchand en a entendu une rumeur. Le livre peut etre lie a un ancien cartographe, a une cite engloutie et a un evenement secret.

Les personnages n'ont pas automatiquement le meme savoir : l'un a seulement entendu le titre, un autre connait son auteur, et un troisieme decouvrira plus tard le contenu cache. Si le marchand revient dans une autre scene, la memoire permet de reprendre ce qu'il sait et ce qu'il a deja revele sans le demander a nouveau a l'IA.

## Flux d'un tour de jeu

1. L'audio est transcrit comme aujourd'hui.
2. Le serveur identifie la campagne, la scene active, les entites deja connues et les noms/alias mentionnes dans la transcription.
3. PostgreSQL recupere uniquement les entites et faits pertinents : lieu, PNJ present, relations, connaissances du personnage, temps fictionnel et derniers evenements lies.
4. Un seul appel narratif recoit ce contexte compact et retourne le texte, les nouvelles entites suggerees, les relations, les changements de connaissance et les changements d'etat proposes.
5. Le serveur valide les changements, les applique et enregistre un evenement. Les faits existants sont reutilises; les nouvelles informations ne sont ajoutees qu'une fois.

La recherche initiale peut s'appuyer sur les noms, alias, tags et la recherche plein texte PostgreSQL. Pas besoin de vecteurs/embeddings au MVP. Un moteur semantique ne se justifierait que si la recherche plein texte devient insuffisante.

Ce modele evite les appels supplementaires pour rechercher ou resumer des faits deja connus, et reduit le contexte envoye. Il ne supprime pas les deux appels actuels necessaires : transcription vocale et generation narrative.

## Demarrage d'une campagne

Une campagne peut commencer avec un prompt libre, quelques lieux, factions ou personnages saisis par le maitre du jeu, ou un petit pack de depart original. Si un pack est propose, ses entrees sont copiees dans la campagne a la creation; le jeu reste ensuite autonome et les modifications ne touchent pas le pack ni les autres campagnes.

L'ambiance vise une fantasy epique originale — anciennes civilisations, longues traversees, royaumes fragiles, alliances, langues et secrets — sans reutiliser les personnages, noms, lieux ou textes d'une oeuvre existante.

## Decisions ouvertes

- La connaissance est-elle propre au personnage, partagee par le groupe, ou les deux ?
- Les ajouts generes par l'IA sont-ils enregistres automatiquement ou demandes au maitre du jeu ?
- Quels faits sont publics, secrets pour les joueurs ou visibles seulement par le maitre du jeu ?
- Comment presenter les nouvelles entites a valider et fusionner les doublons de noms/alias ?
- Quelles regles mecaniques doivent etre independantes du systeme de jeu (armes, armure, degats, PV) ?
- Faut-il un pack original de depart, une creation libre, ou les deux ?
- Comment migrer progressivement l'inventaire texte et la fiche JSONB actuels vers des references d'entites sans perdre les donnees existantes ?

## Etapes possibles

1. Definir les types d'entites, les niveaux de connaissance et les regles de visibilite.
2. Ajouter les migrations et schemas valides pour les entites, relations, connaissances et evenements.
3. Lire le contexte pertinent au tour de jeu et le fournir a l'appel narratif existant.
4. Extraire et valider les nouvelles entites/relations dans la meme reponse IA.
5. Ajouter une vue de campagne pour consulter, corriger et enrichir son journal d'entites.
6. Normaliser les personnages et inventaires quand les regles de jeu sont definies.