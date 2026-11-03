# AIMF : pilote Lyria privé, préparation de la recette Cloudflare (lot C1-DISTANT)

**Statut : préparation de code seulement.** Rien de ce document n'a été exécuté sur Cloudflare : aucune ressource,
aucun déploiement, aucun secret, aucune session, aucun appel Google. Chaque étape marquée **GO séparé** exige
une autorisation explicite du propriétaire, après vérification des coûts et des modalités R2.
**NO-GO Cloudflare réel et Lyria payant** tant que cette matrice n'est pas validée.

## 1. Topologie retenue : un Worker de recette dédié

| Option | Description | Décision |
|---|---|---|
| A. Worker dédié `aimf-lyria-pilot-recette` | entrée `src/music/private-pilot-entry.ts` : `fetch` (chemin `/api/studio/lyria-private` seulement), `queue`, `scheduled` | **retenue pour la recette** : elle ne suppose rien de l'hébergement Lovable |
| B. Worker de l'application (`src/server.ts`) | expose les mêmes `fetch`, `queue()` et `scheduled()` | **non prouvée** : on ignore si l'hébergement Lovable transmet les liaisons, `queue()` et Cron ; à vérifier séparément, sans toucher au Worker existant |

Le Worker existant du compte n'est ni lu, ni modifié, ni réutilisé. Le Worker dédié a son propre nom, ses propres
ressources et aucune route : il n'est joignable qu'après un GO qui en ouvre une.

## 2. Configuration proposée (non déployée)

Fichier : `docs/music/cloudflare/wrangler.recette.jsonc`. Il est rangé sous `docs/` : ni le build ni Wrangler ne le
lisent sans `--config` explicite (un test vérifie qu'aucun `wrangler.*` n'existe à la racine).

| Élément | Valeur | Remarque |
|---|---|---|
| Nom | `aimf-lyria-pilot-recette` | ressources homonymes, dédiées |
| D1 | `AIMF_PRIVATE_LYRIA_DB` → `aimf-lyria-pilot-recette` | `database_id` = marqueur, non déployable en l'état |
| File | producteur et consommateur `aimf-lyria-pilot-recette` | lot de 1, `max_retries` 0, `max_concurrency` 1 |
| R2 | `AIMF_PRIVATE_LYRIA_BUCKET` → `aimf-lyria-pilot-recette` | **privé** : ni domaine public, ni r2.dev |
| Cron | `*/5 * * * *` | réconciliation autonome |
| Routes | aucune ; `workers_dev` et `preview_urls` à `false` | |
| Variables | `ENABLED=0`, `AI_ROUTES_PAUSED=1`, `PROVIDER=mock`, `AUDIO_CHECK=client`, Supabase vides | fermée par défaut |
| Secret attendu (GO séparé) | `AIMF_PRIVATE_LYRIA_OWNER_ID` | `GEMINI_API_KEY` **non requis et non posé** en mode `mock` |
| `define` | `import.meta.env.VITE_SUPABASE_*` → `undefined` | hors de Vite, la vérification de session lit les liaisons |

Vérifié localement : `wrangler deploy --dry-run` (4.151.3, sans session, dossier de configuration vide) assemble
l'entrée (40 Kio, 11 Kio gzip), reconnaît les trois liaisons et remplace `import.meta.env`.

À décider avant le GO : **quel projet Supabase** sert à vérifier la session du propriétaire (lecture seule
`GET /auth/v1/user`). Tant que `SUPABASE_URL` est vide, le frontal refuse tout (503).

## 3. Reprise autonome (Cron)

`runScheduledReconciliation()` (`src/music/private-pilot-worker.ts`) exécute la même réconciliation que le frontal,
**sans visite du propriétaire** :

- interrupteur éteint : aucune lecture ; arrêt d'urgence actif, absent ou illisible : aucune action ; liaison
  manquante : aucune action ;
- tentative jamais engagée et inactive depuis 60 s : renvoyée dans la file, **4 envois au plus au total**, puis
  `halted` (`handoff_exhausted`) : jamais engagée, donc jamais facturée, et toujours comptée ;
- tentative engagée et muette depuis 20 min : aucun objet R2 → `needs_review` (`outcome_unknown`) ; objet présent
  → message `recover` au consommateur, qui hache le contenu avant d'enregistrer `stored` ; R2 illisible → rien
  n'est conclu.

Précautions contre les nouvelles dépenses : le Cron n'a aucun accès au fournisseur, ne crée aucune tentative, ne
relève pas le plafond, ne fait que renvoyer une tentative existante jamais engagée, et le consommateur revérifie
l'arrêt d'urgence avant tout engagement. Un message `recover` ne peut jamais engager le fournisseur.

## 4. Intégrité des MP3

| Étape | Preuve | Coût |
|---|---|---|
| Écriture | SHA-256 calculé sur les octets en mémoire, envoyé à R2 avec l'option `sha256` : **R2 refuse** une écriture dont le contenu diffère | dans le consommateur |
| Enregistrement | l'empreinte de référence est celle de D1 (`audio_sha256`) ; les métadonnées R2 ne prouvent rien et ne sont plus lues à la lecture | aucun |
| Lecture (défaut `client`) | flux natif de R2, empreinte D1 dans `Repr-Digest` ; **le navigateur hache tout le fichier et refuse de le jouer** s'il diffère | ~0 CPU JavaScript côté Worker |
| Lecture (`server`) | le Worker hache aussi en flux et fait échouer la réponse à la fin sur une différence | voir mesures |
| Récupération | le consommateur hache l'objet entier et le compare à l'empreinte écrite avec lui avant `stored` ; sinon `storage_integrity_failed` | dans le consommateur (30 s) |

Mesures sous workerd local (wrangler 4.151.3, ce PC, 5 passages, barrières D1 de 4 à 7 ms à déduire), 3 Mo :

| Phase | ms |
|---|---|
| Hachage en flux, segments de 4 Kio (taille produite localement) | 110 à 132 |
| Hachage en flux, segments de 64 Kio | 40 à 66 (une pointe à 107) |
| Hachage d'un flux sans retransmission, 64 Kio | 36 à 50 |
| `crypto.subtle.digest` d'un seul bloc | 31 à 40 |
| Fournisseur fictif : construction de la réponse de 4 Mo | 247 à 289 |
| Fournisseur fictif : construction + analyse par le vrai code | 369 à 396 |
| Mémoire du processus workerd (tout le runtime local) | 244 Mo avant, 388 Mo après ces 35 mesures |

Conclusion : le hachage côté serveur dépasse largement les 10 ms d'une requête HTTP gratuite ; il reste très en
dessous des 30 s d'un consommateur. D'où `client` par défaut, `server` à mesurer en recette (T10). Le surcoût du
fournisseur fictif (≈ 0,3 s de construction) n'existe pas avec Lyria réel.

## 5. Incidents : ce qui est su, ce qui ne l'est pas

Aucun cas ne relance le fournisseur. Toute issue engagée et non stockée devient `needs_review`, qui bloque le pilote.

| Motif | Facturation Google | Morceau | Message affiché (fr) |
|---|---|---|---|
| `provider_failed` | possible | aucun | « Google n'a pas renvoyé de morceau exploitable. L'appel a pu être facturé. Aucun nouvel essai automatique. » |
| `provider_rate_limited` | inconnue | aucun | « Google a refusé l'appel (limite de débit). La facturation de cet appel n'est pas connue. Aucun nouvel essai automatique. » |
| `provider_invalid_output` | possible | inutilisable | « Google a renvoyé un fichier inutilisable. L'appel a pu être facturé. Aucun nouvel essai automatique. » |
| `storage_failed` / `storage_size_mismatch` | **probable** | **perdu** | « Le morceau a pu être produit et facturé, mais il n'a pas pu être enregistré : il est perdu. Aucun nouvel appel ne sera lancé. » |
| `storage_integrity_failed` | possible | non diffusé | « Le fichier conservé ne correspond pas à son empreinte : il n'est pas diffusé. L'appel a pu être facturé. » |
| `outcome_unknown` | possible | aucun connu | « Traitement interrompu : l'issue de l'appel est inconnue et il a pu être facturé. Aucun nouvel appel ne sera lancé. » |

**Cas « Google facture puis R2 reste indisponible »** : le morceau est reçu, deux écritures R2 échouent (stockage
seulement), la tentative passe en `needs_review` `storage_failed`. Le morceau est perdu, l'appel est
vraisemblablement facturé, rien n'est relancé ni remboursé par le code. Le pilote reste bloqué jusqu'à la revue.

Procédure de diagnostic du propriétaire :

1. Geler : `AI_ROUTES_PAUSED=1` (ou `UPDATE aimf_pilot_settings SET frozen = 1 WHERE scope = 'lyria-3.5';`).
2. Lire la tentative (lecture seule) : `SELECT id, state, provider_engaged_at, handoffs, review_reason, audio_bytes,
   created_at, updated_at FROM aimf_pilot_jobs ORDER BY created_at;`
3. Vérifier dans R2 la présence de `pilot/<owner>/<id>.mp3` (taille, métadonnée `sha256`).
4. Comparer l'heure `provider_engaged_at` (UTC, secondes) à l'utilisation affichée dans la console Google.
5. Consigner la conclusion dans le compte rendu de gouvernance.
6. Clôturer, à la main uniquement : `UPDATE aimf_pilot_jobs SET state = 'reviewed', review_reason = review_reason ||
   ' | owner: <note>', updated_at = unixepoch() WHERE id = '<id>' AND state = 'needs_review';` La tentative reste
   comptée dans le plafond de cinq ; le code n'écrit jamais `reviewed`.

## 6. Matrice des tests d'intégration (planifiée, **non exécutée**)

Prérequis communs (**GO séparé**) : compte et coûts vérifiés, ressources dédiées créées, schéma appliqué sur la D1
de recette, secret `AIMF_PRIVATE_LYRIA_OWNER_ID` posé, projet Supabase choisi, mode `mock` uniquement.

| # | Test | Procédure | Attendu | Arrêt immédiat si |
|---|---|---|---|---|
| T1 | Liaisons | déployer fermé ; GET pilote | 503 `pilot_disabled` ; `wrangler tail` : Cron `disabled` | une liaison manque ou une autre ressource est visée |
| T2 | Arrêt d'urgence | ouvrir l'interrupteur, laisser `AI_ROUTES_PAUSED=1` | 503 `ai_paused`, Cron `paused`, consommateur `paused` | une action a lieu en pause |
| T3 | D1 distante isolée | appliquer le schéma ; tenter 6 insertions, une suppression, `max_attempts=6` | déclencheurs et CHECK refusent | une écriture interdite passe |
| T4 | Collisions | 20 POST simultanés, clés différentes, consommateur en pause | exactement 1 réservation, 19 refus 409 | plus d'une réservation |
| T5 | Idempotence | 20 POST, même clé | 1 création, 19 relectures | une seconde tentative |
| T6 | 6e refus | 5 tentatives `mock`, puis une 6e | 402 `pilot_quota_exhausted` | une 6e réservation |
| T7 | Redélivrance Queues | renvoyer le même message (tableau de bord) | `not_claimed`, aucun nouvel engagement | un second engagement |
| T8 | Cron | insérer à la main une tentative `reserved` ancienne ; attendre un passage | renvoi en file puis `stored` ; 4 envois au plus | un envoi au-delà du plafond |
| T9 | Déconnexion | fermer l'onglet pendant `running`, revenir plus tard | morceau retrouvé, aucun nouvel appel | une seconde tentative |
| T10 | CPU et mémoire | 3 générations `mock` (3 Mo) en mode `client`, puis `server` | temps CPU par invocation (`wrangler tail`) : frontal, consommateur, Cron | dépassement de limite (erreur 1102) |
| T11 | R2 privé et altération | aucun accès public ; altérer l'objet stocké | lecture refusée par le navigateur (et le serveur en mode `server`) ; récupération → `storage_integrity_failed` | un fichier altéré est joué |
| T12 | Écriture R2 contrôlée | écriture avec `sha256` erroné (script de recette) | R2 refuse | l'écriture est acceptée |
| T13 | Fin de recette | geler, exporter le compte rendu, supprimer la recette (**GO séparé**) | aucune ressource orpheline | |

Coûts à confirmer avant le GO (non vérifiés ici) : Workers, D1 et Queues dans les quotas gratuits pour quelques
dizaines d'opérations ; R2 dans son offre gratuite (quelques Mo), **mais les modalités d'activation de R2 (moyen
de paiement exigé ou non) doivent être vérifiées par le propriétaire**. Aucun coût Google : le mode `mock` ne
contacte aucun réseau (vérifié par test).

## 7. Preuves locales de ce lot

- `src/music/private-pilot.test.ts`, `private-pilot-recette.test.ts`, `PrivateLyriaPilot.test.tsx` : Cron sans
  visite, plafond des envois, récupération par hachage, altérations (contenu, taille, métadonnées, écriture),
  fournisseur fictif sans réseau, revue manuelle, configuration inactive et sans secret.
- `wrangler deploy --dry-run` local de la configuration de recette ; mesures workerd ci-dessus.
