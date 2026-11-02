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

## Architecture asynchrone (lot correctif, mode exclusivement simulé)

Décidée par la revue du propriétaire sur la PR #18 (GO de développement sans activation).

| Pièce | Rôle | Fichiers |
|---|---|---|
| Frontal HTTP léger | interrupteur du pilote et arrêt d'urgence `AI_ROUTES_PAUSED` (fermés par défaut), origine, session vérifiée côté serveur, identifiant propriétaire (secret serveur), validation, réservation D1, envoi d'un message contenant **un identifiant seulement**, consultation de l'état, relecture du MP3 en flux depuis R2. **Jamais d'appel Google, jamais d'audio en base64.** | `src/music/private-demo-handler.ts` |
| Machine d'états D1 | `reserved → queued → running → stored / needs_review`, `reserved/queued → halted` ; `provider_engaged_at` écrit une seule fois ; 5 tentatives au plus (contrainte et déclencheur) ; ni suppression, ni remise à zéro, ni remboursement | `src/music/private-pilot-sql.ts`, `private-pilot-store.ts`, `docs/music/LYRIA-PRIVATE-DEMO-D1.sql` |
| Consommateur de file | seul endroit où Google peut être appelé ; réclamation atomique avant l'appel : **au plus un appel par identifiant**, malgré les relivraisons, la concurrence ou un redémarrage ; MP3 validé → R2 privé (empreinte SHA-256) → `stored` | `src/music/private-pilot-worker.ts`, `src/server.ts` (`queue()`) |
| Réconciliation | tentative jamais engagée et inactive : renvoyée dans la file (pilote ouvert seulement) ; tentative engagée et muette depuis plus de 20 min : `stored` si le MP3 est complet dans R2, sinon `needs_review`. **Jamais de nouvel appel Google.** | idem |
| Interface | suivi de l'état, reprise après fermeture de l'onglet, relecture depuis le stockage privé | `src/components/premium/PrivateLyriaPilot.tsx` |

Distinction obligatoire : `provider_engaged_at` NULL = **appel Google jamais engagé** (aucune facturation possible) ;
NOT NULL = **issue de facturation inconnue** tant que le morceau n'est pas `stored`. Toute issue engagée et non
stockée devient `needs_review`, qui **bloque le pilote** jusqu'à la revue du propriétaire.

Liaisons serveur attendues (aucune n'est créée par ce lot) : `AIMF_PRIVATE_LYRIA_DB` (D1 isolée),
`AIMF_PRIVATE_LYRIA_QUEUE` (producteur et consommateur), `AIMF_PRIVATE_LYRIA_BUCKET` (R2 **privé**), secrets
`GEMINI_API_KEY` et `AIMF_PRIVATE_LYRIA_OWNER_ID`, interrupteur `AIMF_PRIVATE_LYRIA_ENABLED=1`, et
`AI_ROUTES_PAUSED` à une valeur ouverte. Ce compteur D1 est **uniquement un coupe-circuit technique du pilote** : il
ne contient aucun crédit membre et ne remplace jamais le grand livre Supabase M1/M2.

## Ce qui reste non prouvé sans ressources réelles

- comportement de D1 réel (écritures sérialisées, concurrence de plusieurs instances) : le SQL est exécuté sur
  SQLite (`node:sqlite`) dans les tests, pas sur D1 ;
- livraison Queues réelle (au moins une fois, délais, 30 s de CPU annoncées pour le consommateur) : file simulée ;
- R2 réel (confirmation d'écriture, métadonnées, flux) : stockage simulé ;
- lecture de `AI_ROUTES_PAUSED` et des liaisons dans l'environnement d'exécution de l'hébergement Lovable, et prise
  en charge d'un consommateur `queue()` par cet hébergement ;
- CPU et mémoire réels du consommateur sur une réponse Lyria d'environ 4 Mo ;
- facturation par Google d'une requête interrompue ou refusée.

**Décision :** NO-GO pour activation, déploiement et appel réel. Conditions du futur GO réel : isolation Cloudflare
confirmée, liaisons et conditions fournisseurs vérifiées, tests d'intégration sur ressources isolées autorisés
séparément, mesure CPU et mémoire, budget validé, autorisation distincte du propriétaire pour la première génération.
Ne pas fusionner sur `main` avant revue ; ne jamais pousser de MP3 sur le dépôt public.
