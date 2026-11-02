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

Ce lot n'implémente **pas** encore le garde budgétaire, la nouvelle route, l'interface
ou la gestion de fichiers. La prochaine PR doit les apporter en conservant la sécurité P0
et les décisions M1/M2. L'architecture du stockage et le mécanisme de réservation atomique
doivent être validés avant de faire une génération réelle depuis un bouton.
