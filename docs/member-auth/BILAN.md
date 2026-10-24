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
| Variables locales | « copier en `.env` » | **`.env.local`** ; `.env` et `.env.*` sont désormais ignorés par `.gitignore`, seul `.env.example` reste versionné | `git check-ignore` et test de dépôt |

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

Vérification sur PostgreSQL local (PGlite, pas aimf-dev) : **25 contrôles sur 25**, dont isolation des
profils, suppression de compte, avatar, statuts, absence de colonne de privilège, refus de l'`upsert`.
**Mutations** : 7 casses volontaires de la migration (contrainte d'avatar retirée, cascade retirée,
droit sur `id`, colonne `is_admin`, rôles libres, politique qui lit le statut, lecture ouverte à tous),
les 7 sont détectées.

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

- **Local** : copier `.env.example` vers `.env.local` (`.env` fonctionne aussi, les deux sont ignorés), renseigner la clé, redémarrer le serveur de dev.
- **Aperçu et publication Lovable** : définir les deux mêmes noms dans le projet Lovable. **Non vérifié
  depuis ce dépôt.** Les valeurs sont figées à la construction ; ajouter aussi l'adresse de l'aperçu
  aux URLs de redirection d'Authentication.
- Sans les deux variables, l'application fonctionne : pages de compte explicatives, aucune requête.
- Jamais de clé secrète, de mot de passe de base ou d'identifiant SMTP dans le dépôt ni dans une
  variable `VITE_` : un test automatisé le garantit (source, SQL, docs, `.env.example`).

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
| Vitest, suite complète | 652 tests, 29 fichiers, tous réussis | simulé (client Supabase et routeur remplacés) |
| ESLint, comparaison fichier par fichier avec la base | aucun nouvel avertissement | réel |
| `vite build` | succès, aucun avertissement de taille | réel |
| Parcours en navigateur réel (inscription, confirmation, renvoi, lien expiré, connexion, récupération, déconnexion, garde de route, backend injoignable) | 39 sur 39 | **simulé** : serveur GoTrue/PostgREST écrit pour l'occasion, qui refuse l'`upsert` comme la vraie base |
| Chargement à la demande en navigateur réel | 5 contrôles sur 5 (aucun supabase-js ni requête en parcourant le site ; chargé sur une page de compte ; démarré avec une session stockée) | simulé |
| Migration et RLS | 25 contrôles, 7 mutations détectées | PostgreSQL local, pas aimf-dev |
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

1. Fournir la clé publishable (variable locale et variables Lovable).
2. Relire puis appliquer la migration sur aimf-dev, puis lancer `supabase/verify/member_profiles_rls_test.sql`
   (25 lignes à `ok = true`).
3. Vérifier dans Authentication : Site URL, URLs de redirection (publication, aperçu, local),
   confirmation d'adresse activée, longueur minimale 12, SMTP Sawaz.
4. Faire une fois le parcours complet avec une boîte e-mail dont vous êtes propriétaire, puis supprimer
   le compte de test.
5. Avant toute ouverture publique : suppression autonome du compte, voir `EXIGENCES-ET-PARCOURS.md`.
6. La préparation musicale sans compte, avec inscription au clic **Générer**, conservation des saisies et
   avatar facultatif, reste un lot ultérieur documenté dans le même fichier (rien n'est implémenté).
