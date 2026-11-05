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
| Consommateur de file | seul endroit où Google peut être appelé ; réclamation atomique avant l'appel : **au plus un appel par identifiant**, malgré les relivraisons, la concurrence ou un redémarrage ; MP3 validé → R2 privé (empreinte SHA-256) → `stored` ; **uniquement dans le Worker dédié** (C-2) | `src/music/private-pilot-worker.ts`, `src/music/private-pilot-entry.ts` (`queue()`) |
| Relais Lovable (P3a) | même contrat navigateur ; contrôles, signature HMAC, un seul envoi, flux audio sans tampon ; `src/server.ts` n'expose plus que `fetch` | `src/music/private-pilot-relay.ts`, `src/server.ts` |
| Façade signée du Worker (P3a) | chemin interne `/internal/v1/lyria-pilot` ; HMAC (fenêtre ± 60 s, `Idempotency-Key` signée) avant toute E/S ; Access facultatif ; session revérifiée | `src/music/private-pilot-service.ts`, `private-pilot-hmac.ts`, `private-pilot-access.ts` |
| Réconciliation | tentative jamais engagée et inactive : renvoyée dans la file (pilote ouvert seulement, 4 envois au plus, puis `halted`) ; tentative engagée et muette depuis plus de 20 min : sans objet R2, `needs_review` ; avec objet, contrôle du **contenu** haché par le consommateur avant `stored`. **Jamais de nouvel appel Google.** Déclenchée par le frontal **et par un Cron**, sans visite du propriétaire | idem, `runScheduledReconciliation()` |
| Intégrité | empreinte D1 de référence ; R2 refuse une écriture altérée (`sha256`) ; lecture : `Repr-Digest`, vérifiée par le navigateur (et par le Worker en mode `server`) | `src/music/private-pilot-integrity.ts` |
| Fournisseur fictif | mode `mock` : réponse de taille réelle, construite en mémoire, analysée par le vrai code ; aucun réseau, aucun secret | `src/music/private-pilot-mock.ts` |
| Worker de recette | entrée dédiée `fetch`/`queue`/`scheduled`, configuration inactive | `src/music/private-pilot-entry.ts`, `docs/music/cloudflare/wrangler.recette.jsonc` |
| Interface | suivi de l'état, reprise après fermeture de l'onglet, relecture depuis le stockage privé, motif exact de chaque revue, contrôle d'empreinte avant lecture | `src/components/premium/PrivateLyriaPilot.tsx` |

Recette Cloudflare, incidents et procédure du propriétaire : `docs/music/LYRIA-PILOT-RECETTE-CLOUDFLARE.md`.

Distinction obligatoire : `provider_engaged_at` NULL = **appel Google jamais engagé** (aucune facturation possible) ;
NOT NULL = **issue de facturation inconnue** tant que le morceau n'est pas `stored`. Toute issue engagée et non
stockée devient `needs_review`, qui **bloque le pilote** jusqu'à la revue du propriétaire.

Liaisons serveur attendues (aucune n'est créée par ce lot) : `AIMF_PRIVATE_LYRIA_DB` (D1 isolée),
`AIMF_PRIVATE_LYRIA_QUEUE` (producteur et consommateur), `AIMF_PRIVATE_LYRIA_BUCKET` (le bucket AIMF **privé**
existant `aimf-media-staging`, **`jurisdiction: "eu"`**, préfixe `pilot/` seulement, garde dans le code), secret
`AIMF_PRIVATE_LYRIA_OWNER_ID`, fournisseur `AIMF_PRIVATE_LYRIA_PROVIDER` (`mock` ou `lyria-3.5`, valeurs exactes ;
`GEMINI_API_KEY` requis seulement pour `lyria-3.5`), interrupteur `AIMF_PRIVATE_LYRIA_ENABLED=1`, contrôle de
lecture `AIMF_PRIVATE_LYRIA_AUDIO_CHECK` (`client` par défaut), un déclencheur Cron et `AI_ROUTES_PAUSED` à une
valeur ouverte. Ce compteur D1 est **uniquement un coupe-circuit technique du pilote** : il
ne contient aucun crédit membre et ne remplace jamais le grand livre Supabase M1/M2.

## Ce qui reste non prouvé sans ressources réelles

- comportement de D1 réel (écritures sérialisées, concurrence de plusieurs instances) : le SQL est exécuté sur
  SQLite (`node:sqlite`) dans les tests, pas sur D1 ;
- livraison Queues réelle (au moins une fois, délais, 30 s de CPU annoncées pour le consommateur) : file simulée ;
- R2 réel (confirmation d'écriture, métadonnées, flux) : stockage simulé ;
- lecture de `AI_ROUTES_PAUSED` et des variables serveur du relais dans l'environnement d'exécution de
  l'hébergement Lovable, connectivité réelle de Lovable vers le Worker, écart d'horloge réel et comportement en flux
  du relais sur cet hébergement (mesurés seulement en local) ;
- CPU et mémoire réels du consommateur sur une réponse Lyria d'environ 4 Mo, et coût réel du hachage en flux
  (mesuré seulement sous workerd local) ;
- refus réel par R2 d'une écriture dont l'empreinte `sha256` diffère, et taille des segments des corps R2 ;
- facturation par Google d'une requête interrompue ou refusée.

**Décision :** NO-GO pour activation, déploiement et appel réel. Conditions du futur GO réel : isolation Cloudflare
confirmée, liaisons et conditions fournisseurs vérifiées, tests d'intégration sur ressources isolées autorisés
séparément, mesure CPU et mémoire, budget validé, autorisation distincte du propriétaire pour la première génération.
Ne pas fusionner sur `main` avant revue ; ne jamais pousser de MP3 sur le dépôt public.
