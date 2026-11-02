# AIMF — Lyria 3.5 : pilote privé de vraie génération musicale

État du lot : **adaptateur isolé et tests simulés**, **AUCUN appel payant exécuté par cette branche**.
Le projet principal reste en pause ; la branche ne contient ni route HTTP publique, ni secret,
ni activation de génération, ni modification Supabase. Ne pas confondre la présence de l'adaptateur
avec une fonctionnalité accessible aux utilisateurs.

## Faits vérifiés

- Modèle : `lyria-3.5`, API Gemini Interactions `POST /v1beta/interactions`.
- Entrée : texte ; sortie : blocs d'audio MP3 et blocs de paroles/structure dans `steps`.
- Tarif publié lors de la préparation : 0,08 USD par titre complet, susceptible d'évoluer.
- Le propriétaire signale un crédit prépayé de 5 USD sur son compte Google. **Solde exact non vérifié**.
- Tests historiques : trois générations chantées réelles déjà effectuées (ne valent pas activation).
- Documentation : https://ai.google.dev/gemini-api/docs/music-generation
- Tarifs : https://ai.google.dev/gemini-api/docs/pricing

## Conditions obligatoires avant le premier clic payant depuis AIMF

1. **Accès propriétaire seulement** : `verifyMemberSession()` doit confirmer l'identité
   puis le serveur doit comparer l'ID du membre à l'ID propriétaire configuré **côté serveur**.
   Ne pas se contenter d'un bouton caché, d'un email côté navigateur ou d'un header utilisateur.
2. **Protection anti-dépense partagée** : réserve atomique persistante côté serveur, avec
   plafond initial de **5 chansons** et **0,50 USD de consommation autorisée pour le pilote**,
   indépendamment du crédit disponible de 5 USD. Cette réserve doit survivre aux redémarrages,
   aux requêtes concurrentes et à plusieurs instances. Sans magasin durable testé : **503, refus**.
3. **Idempotence** : un identifiant de requête généré et enregistré côté serveur avant l'appel.
   Une répétition d'une requête ne provoque jamais une seconde dépense. Un résultat dont le
   statut est inconnu ne doit pas être relancé automatiquement.
4. **Clé Google** : `GEMINI_API_KEY` disponible uniquement dans les secrets du serveur,
   jamais dans GitHub, dans un `VITE_*`, un log, un lien ou une réponse utilisateur.
5. **Interrupteur privé OFF par défaut** : activation explicite après tests du budget,
   autorisation du propriétaire et validation du bon environnement.
6. **Test complet sans coût d'abord** : API simulée, bonne session, autre compte, expiration,
   conflits concurrents, nouvelle instance, échec fournisseur, disparition du résultat.
7. **Traçabilité** : conserver l'heure, ID de génération, modèle, état de réservation,
   sortie vérifiée et coût estimé ; ne journaliser ni clé ni paroles privées.
8. **Stockage et session** : les fichiers réels ne doivent jamais être publiés dans un bucket
   public par défaut ; vérifier les droits et la conservation avant toute écriture distante.
9. **Identité produit** : le mode d'essai doit être explicitement présenté comme pilote privé ;
   l'ancienne route TTS `/api/studio/generate` reste suspendue. Ne jamais remplacer
   silencieusement une voix parlée par un chant sans adaptation des textes et tests.
10. **Aucune action production implicite** : ni fusion, déploiement, migration, activation IA
    ni appel payant sans étape de décision supplémentaire.

## Contrat de l'adaptateur

`src/music/lyria35.ts` expose `buildLyriaPrompt`,
`parseLyriaInteraction` et `generateLyriaSong`.

`generateLyriaSong` envoie **une seule** requête (jamais de retry). L'appelant doit d'abord
s'assurer que la dépense est autorisée. La réponse audio est vérifiée (MP3 et taille).
Les paroles éventuellement retournées sont du texte libre, pas une garantie de synchronisation.

Ce lot contient désormais le **code préparatoire** du garde budgétaire D1, une route
privée désactivée par défaut et une interface de pilote cachée par défaut, mais il
n'active aucune génération en ligne. Les garde-fous sont documentés et testés
avec des doubles D1 ; **l'atomicité réelle D1 et la configuration serveur
ne sont pas encore validées**.

- SQL à vérifier et appliquer séparément sur un D1 dédié et isolé :
  `docs/music/LYRIA-PRIVATE-DEMO-D1.sql`. Aucun changement Supabase.
- Binding secret D1 : `AIMF_PRIVATE_LYRIA_DB`.
- Secrets serveur : `GEMINI_API_KEY` et `AIMF_PRIVATE_LYRIA_OWNER_ID`.
- Activation serveur séparée : `AIMF_PRIVATE_LYRIA_ENABLED=1` (défaut OFF).
- Activation visuelle à la compilation : `VITE_PRIVATE_LYRIA_PILOT_UI=1` (défaut OFF).
- Route réservée : `GET/POST /api/studio/lyria-private`, avec vérification
  de session, comparaison de l'ID propriétaire et limite D1.
- Le budget comporte **5 tentatives maximum**, à 0,08 USD l'appel selon
  le tarif publié (0,40 USD de dépenses théoriques hors frais), sous un
  plafond configuré de 0,50 USD. **Ne pas confondre avec une garantie de
  facturation du compte Google.**
- L'appel est comptabilisé dès la réservation, même si la requête échoue ;
  un doute de facturation fige le pilote jusqu'à revue manuelle.
- Les MP3 obtenus ne sont accessibles qu'en mémoire dans l'onglet du navigateur.
  Ils doivent être téléchargés explicitement ; aucun stockage privé distant
  n'est provisionné dans cette PR.

**Décision :** NO-GO pour activation, déploiement et appel réel tant qu'une
preuve d'exécution D1 sur environnement isolé, une vérification des variables
et une revue sécurité indépendante n'ont pas été réalisées. Ne pas fusionner
sur main avant revue, et ne pas pousser les trois MP3 sur le dépôt public.
