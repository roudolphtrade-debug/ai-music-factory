# Parcours membre : bilan de vérification

Branche `feat/member-auth` (base `84beb23`). Ce document accompagne le code ; il ne contient ni secret,
ni donnée réelle. Toutes les adresses sont des adresses réservées (`@example.test`) et tous les noms
sont fictifs.

**Règle de lecture : tout ce qui est marqué « simulé » ne prouve rien sur le projet aimf-dev ni sur le
SMTP Sawaz.** Aucune migration distante, aucun compte réel, aucun push, aucune publication.

## 1. Ce que le lot contient

Inscription par e-mail et mot de passe, confirmation avec renvoi et gestion des liens expirés, connexion,
déconnexion, récupération et réinitialisation du mot de passe, profil privé (nom, pseudo, statuts
artiste et label facultatifs, avatar facultatif), page de bienvenue, menu de compte à la place de
« Studio A », six langues dont l'arabe en RTL. La découverte publique et les données locales ne
changent pas : rien n'est rattaché automatiquement au compte.

Backend prévu : projet externe aimf-dev, sans Lovable Cloud. Navigateur : URL du projet et clé
publique seulement. Mise en place : `supabase/README.md`.

## 2. Corrections apportées dans cette passe

| Sujet | Avant | Après | Preuve |
|---|---|---|---|
| Longueur du mot de passe | 10 caractères | **12** (formulaires, six traductions, tests) ; maximum 72 octets avec message dédié ; pluriel arabe corrigé | tests de validation aux bornes 11/12/72/73, test « la règle affichée = la règle du code » dans les six langues |
| Enregistrement du profil | `upsert` | `update` de sa propre ligne, `insert` seulement si le trigger n'a pas créé la ligne | **bug réel** : le `upsert` met `id` dans sa liste `SET`, or les membres n'ont pas le droit d'écrire `id` ; PostgreSQL le refuse. Le serveur simulé l'acceptait et le masquait. Trouvé en rejouant le SQL de PostgREST sur une base locale |
| Avatar | adresse libre | `https://` uniquement (jamais `javascript:`, `data:`, `http:`) | contrainte SQL et test de mutation |
| Poids du premier chargement | supabase-js dans le bundle d'entrée (+69,5 Ko gzip, +47 %), nouvel avertissement Vite « chunk > 500 Ko » | client chargé à la demande ; `safeRedirect` sorti du module zod | voir section 6 |
| Variables | « copier en `.env` » | **`.env` versionné avec les deux valeurs publiques d'aimf-dev** (lu par Lovable, voir section 15) ; `.env.local` et toutes les autres variantes `.env.*` ignorés ; `.env.example` documente les noms | `git check-ignore` et test de dépôt |

## 3. Statuts artiste et label, avatar

- Facultatifs : aucun n'est coché par défaut, « Plus tard » enregistre seulement la fin de l'accueil.
- Cumulables : artiste et label peuvent être cochés ensemble, puis décochés (tests d'interface sur
  l'accueil et sur Paramètres ; contrainte SQL qui accepte `{}`, `{artist}`, `{label}`, `{artist,label}`).
- Aucun privilège : le champ `creator_roles` n'est lu que par le modèle de profil et le formulaire
  (test qui scrute le code), aucune politique ni fonction SQL ne le lit, la table n'a aucune colonne
  d'administration (tests SQL), et rien d'autre que `artist` et `label` n'est accepté.
- L'avatar reste une initiale. La colonne `avatar_url` est facultative et prête pour un lot ultérieur.

## 4. Migration relue (`supabase/migrations/20261024090000_member_profiles.sql`)

Le détail point par point est dans `supabase/README.md` (section 2). En résumé : RLS activée, `anon` sans
aucun droit, `authenticated` limité à sa ligne ; droits par colonne (`id`, `created_at`, `updated_at`
jamais écrits par un membre) ; pas de droit de suppression, la ligne disparaît avec le compte
(`on delete cascade`) ; trigger `security definer` à `search_path` vide, exécution retirée aux rôles de
l'API, nom lu dans l'adresse e-mail et jamais dans les métadonnées modifiables.

Vérification sur PostgreSQL local (PGlite, pas aimf-dev) : **35 lignes à `ok`** (34 contrôles et une
assertion finale sur leur nombre exact, sans résultat faux ni nul), dont isolation des profils,
suppression de compte, avatar, statuts, absence de colonne de privilège, refus de l'`upsert`,
interdiction d'écrire `created_at` et `updated_at` (en `UPDATE` comme en `INSERT`) et rafraîchissement de
`updated_at` par le trigger (sur une ligne datée de 2020, car `now()` est constant dans une transaction).

**Correction du script de vérification (revue du commit `8ae163a`)** : le contrôle « Alice ne peut pas
créer le profil d'un autre » visait un identifiant inexistant et acceptait n'importe quelle erreur ; une
erreur de clé étrangère (23503) le faisait donc réussir. Il vise maintenant un compte qui existe sans
profil, attend exactement le SQLSTATE 42501, et un contrôle témoin montre que la même insertion réussit
quand c'est le propriétaire qui l'écrit. Tous les contrôles de refus attendent un SQLSTATE précis (42501,
23514 ou 23505). La migration n'a pas changé : aucun défaut démontré.

**Mutations** : 16 casses volontaires de la migration et 3 du script lui-même : 18 détectées, et une
équivalente. Politique d'insertion ouverte, de mise à jour et de lecture ouvertes,
sécurité au niveau des lignes coupée, `created_at` ou `updated_at` inscriptibles (mise à jour et
insertion), trigger absent ou inopérant, `id` inscriptible, lecture anonyme, contrainte d'avatar
retirée, cascade retirée, rôles libres. Pour le script : un contrôle supprimé, un contrôle nul, un
contrôle ajouté sans mettre à jour le nombre attendu. Le seul mutant non détecté est une politique de
mise à jour ouverte avec une politique de lecture intacte : il est sans danger, car une mise à jour ne
touche que des lignes visibles (la lecture ouverte en plus est détectée). Preuve de l'ancien défaut :
sur une politique d'insertion ouverte, l'**ancien script ne détectait rien** (faux succès), le nouveau
détecte.

Limites : pas de suppression de compte par le membre depuis l'application. **C'est une exigence
bloquante avant toute ouverture publique** (fonction serveur nécessaire, critères dans
`EXIGENCES-ET-PARCOURS.md`) ; `{artist,artist}` est accepté par la contrainte (sans effet, l'application ne l'envoie
pas) ; un pseudo refusé révèle qu'il est pris (inévitable pour un pseudo unique) ; le script de
vérification doit encore être exécuté une fois sur aimf-dev.

## 5. Variables d'environnement

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | adresse du projet, publique |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publishable, publique par nature, protégée par la RLS |

- **Local et Lovable** : le fichier `.env` versionné contient les deux valeurs, lues par le serveur local et par
  Lovable. Une autre clé, sur une seule machine : `.env.local` (ignoré, prioritaire).
- **Aperçu et publication Lovable** : rien à définir dans Lovable (son panneau Secrets refuse les noms `VITE_`).
  Les valeurs sont figées à la construction ; ajouter l'adresse de l'aperçu aux URLs de redirection d'Authentication.
- Sans les deux variables, l'application fonctionne : pages de compte explicatives, aucune requête.
- Jamais de clé secrète, de mot de passe de base ou d'identifiant SMTP dans le dépôt ni dans une
  variable `VITE_` : un test automatisé le garantit (source, SQL, docs, `.env`, `.env.example`).

## 6. Taille du bundle, comparée à la base `84beb23`

Méthode : la base est extraite avec `git archive` dans un dossier temporaire et construite avec les mêmes
dépendances ; tailles mesurées sur `.output/public/assets` (gzip).

| Mesure | Base | Maintenant | Écart |
|---|---|---|---|
| Fragment d'entrée | 468,6 Ko brut / 149,3 Ko gzip | 477,9 Ko / 152,3 Ko | **+2,0 %** |
| Premier chargement de l'accueil (entrée, coque, page, imports statiques) | 256,7 Ko gzip | 275,7 Ko gzip | +19,0 Ko (+7,4 %) |
| Avertissement Vite « chunk > 500 Ko » | non | non | |
| Chargés seulement pour un compte | | supabase-js 53,3 Ko, zod et schémas 22,3 Ko | à la demande |
| Total de tout le JS du site (jamais chargé d'un bloc) | 307,4 Ko gzip, 84 fichiers | 418,8 Ko gzip, 115 fichiers | |

### Méthode de comparaison, versions et limites

**Les deux constructions utilisent le même arbre de dépendances installé**, celui de `bun.lock`
(`bunfig.toml` impose un délai de 24 h sur les nouvelles versions). Les 73 dépendances directes de la
base ont été comparées une à une : **73 sur 73 identiques entre `node_modules` et le `bun.lock` de la
base** ; `bun.lock` actuel = celui de la base plus 8 entrées (`@supabase/supabase-js` 2.118.0 et ses
dépendances `auth-js`, `functions-js`, `postgrest-js`, `realtime-js`, `storage-js` 2.118.0,
`@supabase/phoenix` 0.4.5, `iceberg-js` 0.8.1) ; `package.json` n'ajoute que `@supabase/supabase-js` `^2.118.0`.

| Élément | Valeur |
|---|---|
| Système et Node | Windows 11, x64, Node 24.18.0 |
| vite | 8.0.16 |
| @lovable.dev/vite-tanstack-config | 2.26.5 |
| @tanstack/react-start et react-router | 1.168.60 et 1.170.41 |
| react et react-dom | 19.2.5 |
| zod, react-hook-form | 3.25.76, 7.73.1 |
| esbuild (mesure isolée de supabase-js seulement) | 0.25.12 |

Commandes :

| Version | Commandes |
|---|---|
| Base `84beb23` | `git archive 84beb23 \| tar -x -C <dossier temporaire>` ; jonction `node_modules` vers celui du projet ; dans ce dossier, `node_modules/.bin/vite build` (équivalent de `npm run build`) |
| Maintenant | dans le projet, `rm -rf .output` puis `node_modules/.bin/vite build` |
| Mesures | sur `.output/public/assets` : taille brute et `gzip` de Node (niveau par défaut) de chaque `.js` et `.css` ; entrée = plus gros `index-*.js` ; premier chargement = fermeture des imports statiques de l'entrée, de la coque `_app` et de la page d'accueil (les `import()` dynamiques ne sont pas suivis) |

Aucune variable `VITE_` n'était définie pendant ces constructions. Les valeurs sont insérées comme
chaînes, ce qui ne change pas la taille de façon mesurable.

**La comparaison ne reproduit pas exactement la base historique, pour ces raisons :**

1. Le code de la base a été construit avec l'arbre installé **aujourd'hui**, qui contient en plus les
   paquets Supabase (non importés par la base, donc sans effet sur son bundle). Aucun artefact de
   construction de la base n'a été conservé, et je n'ai pas réinstallé une arborescence propre depuis
   le `bun.lock` de la base.
2. Les dépendances **transitives** n'ont pas été comparées une à une, seulement les 73 directes.
3. Le dépôt versionne aussi un `package-lock.json` (dernière modification le 2026-07-05, antérieure au
   `bun.lock` du 2026-10-18) qui épingle des versions **différentes** de celles de `bun.lock` (50 des
   73 dépendances directes diffèrent, par exemple vite 8.1.3 contre 8.0.16, react 19.2.7 contre 19.2.5).
   Il n'a pas été utilisé, ni modifié. Si la construction de Lovable ou d'une CI s'appuyait sur lui,
   les tailles absolues pourraient différer ; l'écart relatif lié au code ne devrait pas changer,
   sans que je l'aie vérifié.
4. Une seule construction par version, sur une seule machine : pas de mesure de variabilité.
5. Taille théorique, pas de temps de chargement réel ni de test réseau.

Avant correction, le fragment d'entrée gagnait 69,5 Ko gzip (+47 %). Le client Supabase ne démarre
maintenant que s'il y a une session à restaurer, un lien de confirmation ou de récupération dans
l'adresse, ou une page de compte ouverte. Un visiteur qui écoute et découvre ne télécharge pas
supabase-js et ne contacte pas le backend (vérifié en navigateur réel).

Reste possible : les textes d'authentification des six langues (11,2 Ko gzip) sont inclus dans le
premier chargement via la coque ; les découper par langue économiserait environ 9 Ko.

## 7. Vérifications exécutées

| Vérification | Résultat | Nature |
|---|---|---|
| `tsc --noEmit` | 0 erreur | réel |
| Vitest, suite complète | 727 tests, 32 fichiers, tous réussis | simulé (client Supabase et routeur remplacés) |
| ESLint, comparaison fichier par fichier avec la base | aucun nouvel avertissement | réel |
| `vite build` | succès, aucun avertissement de taille | réel |
| Parcours en navigateur réel (inscription, confirmation, renvoi, lien expiré, connexion, récupération, déconnexion, garde de route, backend injoignable) | 39 sur 39 | **simulé** : serveur GoTrue/PostgREST écrit pour l'occasion, qui refuse l'`upsert` comme la vraie base |
| Chargement à la demande en navigateur réel | 5 contrôles sur 5 (aucun supabase-js ni requête en parcourant le site ; chargé sur une page de compte ; démarré avec une session stockée) | simulé |
| Migration et RLS | 35 lignes (34 contrôles + assertion du nombre), 19 mutations : 18 détectées, 1 équivalente (sans danger) | PostgreSQL local, pas aimf-dev |
| Matrice d'écrans : 14 écrans × 6 langues × 320, 375, 1024, 1440 px | 336 cas, aucune erreur de page, aucun défilement horizontal | simulé |
| Hygiène du dépôt : aucun secret, deux variables `VITE_` seulement, aucun journal de session, aucune adresse réelle dans les docs | réussi | réel |

**Jamais vérifié** : le comportement d'aimf-dev (réglages Authentication, redirections), l'envoi réel
des e-mails par le SMTP Sawaz, les variables du projet Lovable, un navigateur autre que Chrome,
un appareil réel.

## 8. Signaux de la matrice : corrigés, faux positifs prouvés, incertitudes

**Corrigés**
- Captures arabes décalées : l'outil de capture pleine page décale les pages RTL. Les écrans
  apparaissaient coupés à droite. Preuve : capture « viewport » de la même page correcte, et
  géométrie du DOM centrée (carte de 280 à 696 px dans 975 px). Les captures arabes sont refaites
  en agrandissant la fenêtre à la hauteur de la page.
- Le compte « complété » de la matrice passait par l'`upsert` désormais refusé ; il passe par `update`.

**Faux positifs prouvés**
- `html lang=fr` sur deux captures ZH et PT : capturées pendant l'écran « Chargement… », avant
  l'application de la langue. La matrice attend maintenant la langue et le contenu : 0 occurrence sur
  les 336 cas rejoués.
- « Se connecter » et « Créer » tronqués en arabe : le reflet doré décoratif gonfle `scrollWidth`
  (260 px pour 113 px de large) ; le texte occupe 798,9 à 880 px dans un bouton de 782,9 à 896 px, il
  n'est pas coupé.
- Points de suspension du champ de recherche de la barre du haut aux largeurs étroites : composant
  existant, conçu ainsi, non modifié.
- Détecteur de « clés brutes » : après correction de son échappement, il signale `optional`, `account`
  et `handle` en anglais, qui sont des mots ordinaires égaux à des noms de clés (visibles sur les
  captures comme « optional », « My account », « Handle »).

**Incertitudes restantes**
- Les anciens signaux `fabriquePlus` (FR) et `factoryLater` (EN) sur l'accueil membre : **cause exacte
  non établie**. Ils ne se reproduisent plus (0 sur les rejeux) et les captures concernées n'affichaient
  aucune clé. Garde-fous ajoutés : une clé de traduction manquante rend un texte vide et non son
  nom (`Record<Lang, Dict>` typé, parité testée), et un test d'interface vérifie, dans les six langues,
  qu'aucun nom de clé n'apparaît sur la page de bienvenue. Le défaut d'échappement du détecteur est
  la cause la plus probable, sans preuve.
- Traductions ZH, PT et AR : brouillons à faire relire par des locuteurs natifs.
- Textes juridiques et consentement RGPD : à valider avant ouverture publique.

## 9. Captures représentatives

Dossier `docs/member-auth/captures/` : captures de fenêtre (pas de page entière), serveur **simulé**,
données fictives, réduites à 900 px de large au maximum.

| Fichier | Contenu |
|---|---|
| `sign-up-fr-desktop.png` | inscription, FR, 1440 px |
| `sign-up-en-mobile.png` | inscription, EN, 375 px |
| `check-email-en-desktop.png` | « vérifiez votre boîte », renvoi avec compte à rebours |
| `sign-in-error-en-desktop.png` | connexion refusée, message neutre |
| `link-expired-en-desktop.png` | lien de confirmation expiré |
| `forgot-password-en-mobile.png` | mot de passe oublié |
| `welcome-en-desktop.png` | bienvenue : nom, pseudo, statuts facultatifs, « Plus tard » |
| `settings-member-fr-desktop.png` | Paramètres d'un membre, artiste coché |
| `account-menu-en-desktop.png` | menu de compte dans la barre du haut |
| `settings-guest-en-desktop.png` | Paramètres d'un visiteur, invitation à se connecter |
| `sign-up-zh-desktop.png` | inscription, chinois |
| `sign-up-pt-mobile.png` | inscription, portugais, 375 px |
| `sign-in-ar-mobile.png` | connexion, arabe, RTL, 375 px |
| `welcome-ar-desktop.png` | bienvenue, arabe, RTL, 1440 px |

## 10. Avant de relier le backend réel

1. Fournir la clé publishable : elle est dans le `.env` versionné (section 15).
2. Relire puis appliquer la migration sur aimf-dev, puis lancer `supabase/verify/member_profiles_rls_test.sql`
   (35 lignes à `ok = true`).
3. Vérifier dans Authentication : Site URL, URLs de redirection (publication, aperçu, local),
   confirmation d'adresse activée, longueur minimale 12, SMTP Sawaz.
4. Faire une fois le parcours complet avec une boîte e-mail dont vous êtes propriétaire, puis supprimer
   le compte de test.
5. Avant toute ouverture publique : suppression autonome du compte, voir `EXIGENCES-ET-PARCOURS.md`.
6. La préparation musicale sans compte, avec inscription au clic **Générer**, conservation des saisies et
   avatar facultatif, reste un lot ultérieur documenté dans le même fichier (rien n'est implémenté).

## 11. Raccordement à aimf-dev (état au 2026-10-25)

**Migration** : appliquée sur aimf-dev (`liewjcwkogoesgxcuyff`) par le propriétaire, version distante
`20261024224751`. Ne pas la réappliquer. Le fichier local `20261024090000_member_profiles.sql` en est la
source relue ; les deux numéros décrivent la même migration (le local est celui d'écriture, le distant celui
du moment de l'application). Détail et conduite à tenir avec la CLI : `supabase/README.md`, section 5.

**Rapporté par le propriétaire, non vérifié ici** : les 35 lignes du script SQL à vrai, aucune donnée de
test restante, aucun avertissement de sécurité.

**Vérifié depuis ce dépôt le 2026-10-25, avec la vraie clé publique** (saisie dans `.env.local`, ignoré par
Git ; elle a été versionnée ensuite, volontairement, dans `.env`, voir section 15) :
- `node supabase/preflight.mjs` (lecture seule, aucun compte créé) : **8 contrôles sur 8, sortie 0**.
  Projet attendu reconnu par l'adresse et par l'en-tête `sb-project-ref`, clé de type publique acceptée par
  le projet (HTTP 200), inscription par e-mail activée, nouvelles inscriptions autorisées
  (`disable_signup = false`), confirmation par e-mail exigée (`mailer_autoconfirm = false`), table
  `profiles` présente et illisible par un visiteur (HTTP 401, code 42501).
- L'application démarre sur http://localhost:8080 ; la page d'inscription affiche le formulaire (et non
  « Comptes momentanément indisponibles »), sans erreur de console ; ouvrir la page n'envoie aucune requête
  vers Supabase (le client ne parle au projet qu'à la première action de compte).

**Pas encore vérifié** : le parcours réel avec une vraie boîte e-mail, par le propriétaire : inscription,
réception du mail par le SMTP Sawaz, confirmation et redirection vers localhost:8080, connexion, persistance
après rechargement, récupération du mot de passe, déconnexion, suppression du compte de test. Les
réglages d'Authentication (URL de redirection, Site URL, longueur minimale 12, SMTP) ne sont lisibles qu'en
partie par le contrôle (inscription, confirmation) : le reste se constate pendant le parcours. Feuille de route
et relevé : `PARCOURS-MANUEL.md`.

### Diagnostic d'un échec d'inscription

Une trace sans secret est tenue en mémoire en développement (`src/auth/diagnostics.ts`,
`window.__afmAuthDiagnostics`) : heure, opération, catégorie (réseau, refus du service, SMTP, autre erreur du
service, inconnue), statut HTTP et code d'erreur, jamais le message, l'adresse, le mot de passe ni un jeton.
Elle ne change rien à ce que voit le membre. Mode d'emploi et tableau de décision : `PARCOURS-MANUEL.md`,
section 6. Vérifié par des tests simulés ; aucune vraie tentative d'inscription n'a été observée ici.

### Premier essai réel d'inscription (2026-10-25, 08:36 UTC)

Relevé en lecture seule dans les journaux du projet aimf-dev, sans adresse, sans identifiant de compte et
sans adresse IP (les journaux Auth les contiennent en clair : ne jamais les coller tels quels).

| Observation | Valeur |
|---|---|
| Requête | `OPTIONS` puis `POST /auth/v1/signup` : la requête **est arrivée** au service (ce n'est pas un problème réseau) |
| Réponse du service | HTTP **500**, `error_code = unexpected_failure`, durée environ 3,3 s |
| Cause dans les journaux Auth | `535 "5.7.8 Error: authentication failed: (reason unavailable)"` : le serveur SMTP a **refusé l'authentification** |
| Conclusion | **échec SMTP** (identifiants refusés par le serveur de mail), ni réseau, ni refus du service |
| Effet sur la base | aucun compte et aucun profil créés : l'inscription a été annulée avec l'envoi (`auth.users` vide, `profiles` vide) |
| Base de données | aucune erreur Postgres à l'heure de l'essai ; le trigger de profil n'est pas en cause |

À corriger côté propriétaire dans **Authentication, SMTP Settings** (non modifiable depuis ce dépôt, et les
identifiants ne doivent jamais être communiqués) : nom d'utilisateur (souvent l'adresse complète), mot de
passe ou mot de passe d'application régénéré, hôte et port avec le bon mode (587 STARTTLS ou 465 SSL),
adresse d'expéditeur autorisée par le compte, et côté Sawaz : compte actif, restrictions d'adresse IP,
authentification à deux facteurs. Tester ces identifiants directement chez le fournisseur avant de réessayer.

Contrôles faits le même jour avec l'accès en lecture au projet : un seul projet `aimf-dev`
(`liewjcwkogoesgxcuyff`, actif et en bonne santé, région eu-west-1) ; une seule migration enregistrée,
`20261024224751` `member_profiles` ; table `public.profiles` avec la sécurité au niveau des lignes activée ;
aucun avertissement de sécurité ; `auth.users` et `profiles` vides.

## 12. Parcours réel réussi et messages d'erreur corrigés (2026-10-25)

### Essais réels du propriétaire

Le parcours complet a été réussi sur aimf-dev avec une vraie boîte e-mail, après la correction du SMTP.

| Étape | Résultat | Preuve (journaux Auth du projet, en UTC ; Paris = UTC+1) |
|---|---|---|
| 0.3 Contrôle de connexion | ok, 8 sur 8 | 08:32 : `GET /settings` 200 avec la clé publique, `profiles` refusée à un visiteur (401) |
| 1 Inscription, premiers essais | **échec SMTP** (2 fois) | 08:36 et 11:23 : `POST /signup` 500, `535 5.7.8 authentication failed` : identifiants du serveur de mail refusés |
| 1 Inscription, après correction du SMTP | **réussie** | 11:26 : `POST /signup` 200, `user_confirmation_requested` |
| 2 Réception du mail | **réussie** (rapportée) | corroborée : le lien a été ouvert à 11:28 |
| 3 Confirmation | **réussie** | 11:28 : `user_signedup` (`GET /verify` 303, redirection vers l'application) ; 11:28:23 : lien rouvert, redirection (303) ; 11:28:33 : `POST /resend` 200 |
| 4 Profil | **réussi** | base : 1 profil créé par le trigger, pseudonyme renseigné, accueil terminé |
| 5 Persistance après rechargement | **réussie** (rapportée) | non visible dans les journaux : un rechargement ne rappelle pas le service tant que le jeton est valide ; 1 session ouverte à la fin |
| 6 Déconnexion | **réussie** | 11:41:12 et 11:42:50 : `POST /logout` 204 |
| 7 Reconnexion | **réussie** | 11:32:13 et 11:41:18 : `POST /token` 200, évènement `login` |
| 8 Réinitialisation du mot de passe | **réussie** | 11:42:58 : `POST /recover` 200 ; 11:43:15 : lien de récupération (`GET /verify` 303, `login`) ; 11:43:44 : `PUT /user` 422 `same_password` (le même mot de passe est refusé) ; 11:43:53 : `PUT /user` 200, `user_updated_password` |

État de la base après les essais (lecture seule) : 1 compte, confirmé, déjà connecté ; 1 profil avec
pseudonyme et accueil terminé ; 1 session ouverte ; `profiles` protégée par la sécurité au niveau des
lignes ; aucun avertissement de sécurité. Les journaux Auth contiennent l'adresse et l'adresse IP du
propriétaire : elles ne sont reproduites nulle part dans le dépôt.

Rapporté par le propriétaire, corroboré par les journaux quand une ligne existe. Ce qui ne peut pas se
lire dans les journaux (réception effective du mail, persistance après rechargement) reste déclaratif.

### Messages d'erreur corrigés

| Sujet | Avant | Après |
|---|---|---|
| Échec d'envoi du mail à l'inscription | affiché comme un problème de réseau (« Vérifiez votre réseau »), car la version de la bibliothèque (auth-js) enveloppe toute réponse HTTP 500 et 502 à 504 dans l'erreur « réessayable » que l'application classait en réseau | classement d'après ce que la requête a reçu : **pas de réponse HTTP** = réseau ; **5xx sur l'envoi du mail** = « le mail n'a pas pu être envoyé, problème de notre côté et non de votre connexion » ; **autre 5xx** = « le service est momentanément indisponible, pas un problème de votre connexion » ; adresse refusée par le service de mail par défaut = même message que l'échec d'envoi |
| Pseudonyme refusé | un seul message : « 3 à 24 caractères : lettres minuscules, chiffres et tiret bas » | **caractères refusés** cités (par exemple « (espace), é, - »), **longueur** donnée (« vous en avez saisi 2 », minimum 3, maximum 24), **indisponibilité** annoncée avec une proposition valide (`taken_name2`), et **un exemple valide** (`amina_o`) ; une aide permanente sous le champ |
| Saisies et curseur | les saisies étaient conservées ; le curseur ne bougeait pas pour une erreur venue du service | les saisies restent toujours ; le curseur va au **premier champ invalide** (nom avant pseudonyme) ; une erreur du service qui concerne un champ (pseudonyme pris, mot de passe refusé, adresse refusée) s'écrit sous ce champ et y place le curseur ; un mot de passe incorrect remet le curseur dans le champ mot de passe, texte sélectionné |
| Détails techniques | aucun n'était affiché | aucun non plus : ni code HTTP, ni mot SMTP, ni code d'erreur, ni texte du service ; un test le vérifie dans les six langues |

Règles du pseudonyme (inchangées) : facultatif ; 3 à 24 caractères ; lettres minuscules sans accent,
chiffres et tiret bas ; les majuscules, un @ initial et les espaces autour sont corrigés sans reproche. Les
caractères refusés passent avant la longueur : raccourcir ne sert à rien tant qu'ils sont là.

Vérifications des corrections :
- 727 tests sur 32 fichiers : classement des erreurs, règles et messages du pseudonyme, comportement des écrans
  (saisies conservées, curseur, messages), et pour **chacune des six langues** la présence des caractères,
  du nombre, de la suggestion et de l'exemple, l'absence de marqueur non remplacé, la traduction (pas la phrase
  anglaise) et l'absence de terme technique ;
- navigateur réel (Chrome, serveur simulé) : 4 cas du pseudonyme dans les 6 langues (24 captures) avec curseur
  sur le champ et saisies conservées, échec de mail et service indisponible dans les 6 langues, perte totale de
  connexion simulée dans le navigateur (message « réseau » seulement dans ce cas), arabe en sens droite à gauche
  lisible.

Traductions : ZH, PT et AR restent des textes à faire relire par des locuteurs natifs.

## 13. Politique de mot de passe (2026-10-25)

### Règle appliquée dans l'application

12 caractères au moins, une majuscule, une minuscule, un chiffre et un caractère spécial, à l'inscription et à la
réinitialisation. **Pas à la connexion** : les comptes existants gardent leur mot de passe actuel.

- Les cinq règles sont **affichées avant la saisie** sous le champ, cochées à mesure de la frappe, avec la liste
  des symboles acceptés, dans les six langues (arabe en sens droite à gauche compris).
- Après un refus, le message **cite précisément ce qui manque**, avec la conjonction de la langue (« Il manque :
  au moins 12 caractères, un chiffre (0 à 9) et un caractère spécial. »), les règles manquantes passent en rouge,
  **les valeurs sont conservées** et le curseur va dans le champ mot de passe.
- Le collage et les gestionnaires de mots de passe sont acceptés : aucun blocage du collage, aucune limite de
  longueur sur le champ, `autocomplete="new-password"` à l'inscription et à la réinitialisation,
  `current-password` à la connexion, champs nommés `email` et `password`.
- Les règles reproduisent celles du service : lettres et chiffres **ASCII** (une capitale accentuée comme « É » ne
  compte pas comme majuscule, le service ne la compte pas non plus) et exactement la liste de symboles du service.
  Longueur comptée en caractères ; plus de 72 octets reste refusé.
- Quand le service refuse un mot de passe malgré tout, le message est écrit sous le champ : « refusé, trop faible »
  en général, ou « figure dans des fuites de données connues » quand le service donne la raison `pwned`.

### Protections côté service : disponibles, actives, payantes

| Protection | Disponible | Active sur aimf-dev | Payante |
|---|---|---|---|
| Longueur minimale | oui, tous les plans | **oui, prouvé** par appel direct (422 `weak_password`, raison `length`) | non |
| Caractères requis (minuscules, majuscules, chiffres, symboles) | oui, tous les plans | **oui, prouvé** par appels directs (422 `weak_password`, raison `characters`) | non |
| Refus des mots de passe issus de fuites (HaveIBeenPwned, qui couvre aussi les plus courants) | oui, **Pro et supérieurs** | **non, non disponible : l'organisation est sur le plan Free** | **oui** |
| Dictionnaire distinct de mots de passe courants | non décrit par la documentation | sans objet | |

Aucun abonnement n'a été souscrit. Les deux réglages gratuits ont été enregistrés par le propriétaire dans le
tableau de bord (je n'ai pas d'accès à la configuration d'Authentication, qui demande un jeton d'accès personnel).
**Sans le contrôle payant, rien côté serveur n'écarte un mot de passe courant ou compromis qui respecte les
règles** (par exemple `Password123!`) : la règle du service n'est qu'une exigence de composition, pas un filtre de
mots de passe connus. Étapes de réglage et requête de vérification : `supabase/README.md`, section 3.1.

### Preuve que le service applique les règles (appels directs)

Cinq `POST /auth/v1/signup` envoyés **directement au projet** avec la clé publique, sans passer par le formulaire,
avec des mots de passe factices et des adresses jetables en `@example.invalid` (aucune adresse réelle). Un appel
accepté aurait créé un compte : la série devait s'arrêter au premier.

| Cas | HTTP | `error_code` | `reasons` |
|---|---|---|---|
| Trop court (7 caractères, les quatre classes présentes) | 422 | `weak_password` | `length` |
| Sans majuscule | 422 | `weak_password` | `characters` |
| Sans minuscule | 422 | `weak_password` | `characters` |
| Sans chiffre | 422 | `weak_password` | `characters` |
| Sans symbole | 422 | `weak_password` | `characters` |

Les cinq appels sont refusés par le service. **Aucun compte de test ne subsiste** : les comptages en lecture seule
avant et après sont identiques (utilisateurs 2, identités 2, profils 2, adresses de test 0, sessions 1). Les
journaux Auth montrent trois de ces appels en 422 (les deux autres n'y figuraient pas au moment de la lecture,
retard d'ingestion probable, non prouvé) et aucun appel accepté ni mail de confirmation.

### Limites restantes

- **Réinitialisation non testée séparément côté service** : le refus a été prouvé sur l'inscription. La
  réinitialisation passe par `PUT /user` avec une session de récupération, que je n'ai pas ouverte. La politique est un
  réglage global du service, donc le même refus est attendu, mais ce n'est pas démontré par un appel.
- **Filtrage des mots de passe compromis inactif** (plan Free) : un mot de passe courant qui respecte les cinq
  règles est accepté. Je ne l'ai pas envoyé, il aurait créé un compte.
- Les comptes existants peuvent garder un ancien mot de passe plus faible : la connexion n'applique aucune règle.

### Vérifications

- Tests : critères pris séparément (longueur à la limite 11/12, majuscule, minuscule, chiffre, chaque symbole de la
  liste, caractères qui ne comptent pas), **les 32 combinaisons des cinq critères**, mêmes règles à l'inscription
  et à la réinitialisation, aucune règle à la connexion ; écrans : règles visibles avant la saisie, coche en direct,
  message précis pour chaque critère manquant seul et pour plusieurs à la fois, valeurs et curseur conservés,
  collage non bloqué, indications d'auto-remplissage, refus du service (fuite, caractères) sous le champ, six langues.
- Navigateur réel contre un **serveur simulé** qui applique les mêmes règles : inscription dans les 6 langues avant,
  pendant et après un refus (captures), mot de passe de fuite refusé, réinitialisation (anglais et arabe) refusée
  puis acceptée, compte ancien au mot de passe faible qui se connecte encore. Ce volet est simulé : la preuve du
  comportement réel d'aimf-dev est celle des appels directs ci-dessus.

## 14. Connexion avec Google (2026-10-25)

### Ce que fait l'application

Le bouton « Continuer avec Google » existe dans les six langues sur la page de connexion et la page d'inscription,
et **n'apparaît que si le projet déclare Google activé** (`external.google` vrai dans ses réglages publics, lus avec
la clé publique, une fois par chargement). Un doute (pas de réponse, réponse refusée) vaut « pas de bouton ».

Au retour de Google (flux implicite), l'application revient sur la page de connexion avec une session et
l'acheminement habituel s'applique (nouveau membre vers la page de bienvenue, destination mémorisée). Un retour sans
session (refus ou annulation) affiche « La connexion avec Google n'a pas abouti » et laisse le formulaire e-mail.
Supabase relie automatiquement les identités de même adresse **vérifiée** ; s'inscrire par e-mail avec une adresse
déjà créée par Google donne l'écran neutre habituel, sans mail. Le secret du client Google reste dans le tableau de
bord Supabase : jamais dans le dépôt, une variable `VITE_` ou Lovable (un test de dépôt cherche aussi les secrets et
identifiants Google). Étapes de configuration : `supabase/README.md`, section 3.2.

### État du projet

Le projet aimf-dev **annonce désormais Google actif** : `node supabase/preflight.mjs` affiche « Google sign-in is
enabled in the project », et le serveur local sur le port 8080 (configuration réelle d'aimf-dev) affiche le bouton
« Continuer avec Google » sur `/auth/sign-in`.

### Essais réels du propriétaire

Le propriétaire a réussi, avec son propre compte Google, sur l'application locale branchée sur aimf-dev :

1. **Connexion** avec Google, retour dans l'application connecté.
2. **Maintien après rechargement** : la session est conservée au rechargement de la page.
3. **Déconnexion**.
4. **Reconnexion** avec Google, **sur le même profil**.

Ce qui est vérifié par moi et ce qui est rapporté :

- Rapporté par le propriétaire, **non reproduit par moi** : les quatre étapes ci-dessus (je n'ai pas cliqué sur le
  bouton, qui ouvre une vraie connexion avec son compte). Le maintien après rechargement et la déconnexion ne se
  lisent pas dans la base.
- Vérifié en lecture seule dans la base après les essais, sans reproduire d'adresse : utilisateurs 3 (2 avant),
  identités 3 dont **1 Google**, profils 3, **aucun utilisateur sans profil**, sessions 2. Un seul compte et un seul
  profil Google existent : la reconnexion n'a pas créé de doublon, ce qui concorde avec « même profil ».

### Limites restantes

- Le message du propriétaire ne précise pas l'adresse de la page d'essai ; le serveur local du port 8080 était
  actif. **L'adresse publiée et l'aperçu Lovable ne sont pas couverts** : leurs adresses doivent figurer dans les URL
  de redirection du projet et dans les origines autorisées du client Google (`supabase/README.md`, section 3.2).
- Non essayés en réel : refus ou annulation chez Google, liaison avec un compte créé par e-mail à la même adresse,
  autre navigateur ou autre appareil.
- **Réinitialisation non testée séparément côté service** et **filtrage des mots de passe compromis inactif** (plan
  Free) : voir la section 13 ; ces deux limites restent entières.

### Vérifications

- Tests : bouton absent tant que le projet ne répond pas « activé », présent ensuite dans les six langues, départ vers
  Google avec retour sur la page de connexion et destination mémorisée, refus et panne sans détail technique, retour
  refusé ; réglages publics lus avec la clé seule, une fois par chargement ; recherche de secrets et d'identifiants
  Google dans le dépôt.
- Navigateur réel contre un **serveur simulé** : Google absent puis présent dans les 6 langues, clic jusqu'à la
  connexion d'un nouveau membre, annulation chez Google. Simulé seulement : la preuve du comportement réel est celle
  des essais du propriétaire ci-dessus.

## 15. Clé publishable volontairement publique dans le dépôt (2026-10-25)

**Décision du propriétaire.** Le fichier `.env` est versionné et contient **uniquement** `VITE_SUPABASE_URL` et
`VITE_SUPABASE_PUBLISHABLE_KEY` d'aimf-dev. La clé est une clé *publishable* : elle est publique par nature
(elle part dans le JavaScript envoyé à chaque visiteur) et ce sont les règles de sécurité des lignes (RLS) qui
protègent les données, pas son secret. Cela remplace la phrase précédente de la PR (« clé absente du dépôt »).

**Pourquoi.** La documentation de Lovable range les variables `VITE_` dans le fichier `.env` du projet, pas dans
son panneau Secrets (qui les refuse), et avertit qu'ignorer `.env` dans Git casse l'aperçu. Sans ce fichier,
l'aperçu aurait affiché « comptes momentanément indisponibles ». Aucun besoin de Lovable Cloud ni de connecter
Supabase dans Lovable.

**Ce qui reste privé.** `.env.local`, `.env.production` et toute autre variante `.env.*` restent ignorés par
Git, ainsi que `*.local`. Jamais de clé secrète, de clé `service_role`, de mot de passe de base ni d'identifiant
SMTP, ni dans `.env` ni ailleurs.

**Garde-fous automatiques** (`src/auth/hygiene.test.ts`) : `.env` ne contient que ces deux noms, sans guillemets ni
variable supplémentaire ; l'adresse du projet est celle de `.env.example` ; la clé commence par `sb_publishable_` ;
`.gitignore` n'ignore plus `.env` mais ignore toujours `.env.*` et `*.local` ; le fichier est parcouru par les
mêmes recherches de secrets que le reste du dépôt. Six dégradations volontaires du fichier ou du `.gitignore`
(variable en plus, nom de clé de service, clé secrète, valeur entre guillemets, clé absente, `.env` de nouveau
ignoré) ont été essayées : chacune fait échouer le test.

**Aussi corrigé** : le commentaire d'en-tête de la migration disait « NOT APPLIED » alors qu'elle est appliquée
sur aimf-dev ; seul ce commentaire change, pas une ligne de SQL.

## 16. Recette sur l'aperçu Lovable (2026-10-26)

Après la fusion de la PR #4 (commit de fusion `b61e131`), le propriétaire a fait la recette sur **l'aperçu Lovable**,
branché sur aimf-dev. **Tout ce qui suit est rapporté par le propriétaire** : je n'ai pas conduit ces essais. Je les
ai seulement confrontés, en lecture seule, aux journaux Auth et à la base du projet (aucune adresse, aucune IP,
aucun identifiant de compte n'est reproduit ; heures en UTC).

| Parcours | Rapporté par le propriétaire | Ce que les journaux du 26 octobre montrent |
|---|---|---|
| Inscription et confirmation par e-mail | rapporté comme réussi : **À CONFIRMER** | **Non corroboré ce jour : les essais rapportés ne se retrouvent pas dans les journaux.** Aucune requête d'inscription et aucun envoi de mail de confirmation le 26 ; les 3 comptes du projet datent tous du 25. L'inscription et la confirmation ont été corroborées le 25 (PR #4, section 10), pas le 26. Classement : à confirmer, tant que le propriétaire n'a pas précisé s'il a réutilisé un compte du 25 ou si l'essai n'est pas visible dans ces journaux. |
| Connexion e-mail | réussi | Sur `/token`, un refus (HTTP 400) à 12:10:47 puis une réussite (HTTP 200) à 12:10:51. La raison du refus n'a pas été relevée. |
| Connexion Google | réussi, **dans un onglet séparé** | 4 départs vers Google, 3 retours, puis lectures de la session en 200. Cohérent avec un essai sans retour dans l'aperçu intégré, sans le prouver. |
| Maintien de la session après F5 | réussi | **Déclaratif** : un rechargement ne se lit pas dans les journaux. |
| Déconnexion | réussi | 2 déconnexions (HTTP 204) à 12:09 et 12:10. |
| Reconnexion | réussi | Voir la ligne de la connexion e-mail et celle de Google. |
| Récupération du mot de passe | réussi | Demande à 12:38, lien ouvert à 12:39, nouveau mot de passe enregistré à 12:40 (HTTP 200). |

Légende : les autres lignes sont rapportées par le propriétaire, avec ou sans trace dans les journaux comme indiqué ; seule l'inscription du 26 est classée **à confirmer**.

État de la base après la recette, en lecture seule : 3 utilisateurs, 3 identités dont 1 Google, 3 profils, aucun
utilisateur sans profil, 3 sessions. Aucun compte n'a été créé le 26.

### Le 403 de Google dans l'aperçu intégré

- **Observé** par le propriétaire : un 403 de Google quand la connexion est lancée dans l'**aperçu intégré** à
  l'éditeur Lovable. La même connexion **a réussi dans un onglet séparé**.
- **Cause exacte non établie.** Aucune réponse 403 de Supabase ce jour sur les adresses d'authentification : si le
  refus vient de Google, il ne passe pas par les journaux Supabase.
- **Hypothèse, non vérifiée** (déjà avancée avant l'essai) : Google n'accepte pas d'afficher son écran de connexion
  dans un cadre intégré à une autre page. Une autre cause n'est pas exclue (réglage du client Google, adresse de
  l'aperçu). Aucun changement de code n'est décidé à ce stade.
- **Consigne de test en attendant** : tester la connexion Google dans un onglet séparé (adresse de l'aperçu ouverte
  directement).

### Limites restantes (reprises de la section 13 et de la PR #4)

- Refus côté serveur lors de la réinitialisation du mot de passe : **non testé séparément** (la recette montre que le
  parcours de récupération aboutit, pas que le service refuse un mot de passe faible à cette étape).
- Filtrage des mots de passe compromis : **inactif** (plan Free).
- Google : l'adresse publiée, le refus ou l'annulation chez Google, la liaison avec un compte e-mail de même adresse
  et un autre appareil ne sont pas couverts par cette recette.
- Un GET isolé sans clé sur l'adresse d'inscription, refusé en 401 à 05:29, apparaît dans les journaux du 26 ; il ne
  correspond à aucun essai connu. Il a été refusé et n'a rien créé.
