# Lot proposé : préparer sans compte, s'inscrire au clic « Générer », reprendre, générer

*Analyse et proposition du 2026-10-26, mise à jour avec les décisions du propriétaire du même jour. **Aucun
développement** du studio, **aucun appel IA payant**, aucun changement distant. Ce document décrit ce qui existe
(lu dans le code) et ce que le lot ferait.*

**Autorisation requise.** Les instructions du dépôt indiquent que le Lot 3 (Studio, paiements, publication) n'est
**pas autorisé**. Ce lot touche le studio : il ne démarre qu'avec l'accord explicite du propriétaire.

## 0. Décisions du propriétaire (2026-10-26)

| # | Décision | Où c'est traité |
|---|---|---|
| D1 | Le prochain lot protège **les trois routes payantes** (`generate`, `speak`, `transcribe`) avec une **vérification de session côté serveur avant tout appel fournisseur**. | P5, section 6 |
| D2 | Les tests utilisent **exclusivement des fournisseurs simulés**. Les **essais payants restent bloqués** jusqu'à la mise en place de **quotas côté serveur** et d'un **plafond de dépense vérifiable**. | sections 8 et 11 |
| D3 | Le brouillon est **conservé sept jours sur cet appareil, y compris après une génération réussie**. Un **avertissement précède son effacement à la déconnexion**, et **un autre compte ne peut pas le reprendre**. | P1, P2 |
| D4 | La préparation est **restaurée après connexion, inscription et confirmation**, **sans génération automatique**. Avatar et statuts restent **facultatifs**. | P3, P4 |
| D5 | Les **promesses trompeuses** sur la voix chantée et l'achat de crédits sont corrigées. | P7 |

## 1. Le parcours visé

Préparation sans compte, puis **clic sur Générer**, puis inscription ou connexion, puis **reprise de la préparation
intacte**, puis génération sur un **clic explicite**. L'avatar et les statuts artiste ou label restent
**facultatifs** : ils existent déjà (page de bienvenue, bouton « Plus tard ») et ne bloquent jamais la génération.

## 2. Ce que j'ai examiné

`src/components/premium/StudioComposer.tsx`, `src/routes/_app.studio.tsx`, `src/routes/api/studio/generate.ts`,
`src/routes/api/voice/speak.ts`, `src/routes/api/voice/transcribe.ts`, `src/lib/api-guard.ts`, `src/lib/ai-limits.ts`,
`src/library/credits.ts` et `CreditsProvider.tsx`, `src/library/generatedDrafts.ts` et `GeneratedDraftsProvider.tsx`,
`src/audio/mixTrack.ts`, les appelants `ReadAloudButton.tsx` et `VoicePrompt.tsx`, les textes `studio.*` de
`src/i18n/translations.ts`, et côté comptes `usePostAuth.ts`, `redirects.ts`, `auth.sign-in.tsx`, `auth.sign-up.tsx`,
`auth.confirm.tsx`, `_app.welcome.tsx`. Lecture seule.

## 3. Ce qui fonctionne réellement, ce qui est simulé ou inerte

| Élément | État | Détail |
|---|---|---|
| Génération d'un « titre » | **Réel côté appel**, mais ce n'est **pas un modèle musical** | Un modèle de texte écrit un refrain de 4 lignes, puis une **synthèse vocale** le lit avec la consigne de le dire de façon rythmée et mélodique. Le résultat est une **voix de synthèse**, pas une voix qui chante ni une chanson composée par une IA musicale. |
| Fond instrumental | **Réel, local, gratuit** | Synthétisé dans le navigateur (batterie, basse, nappe) selon le genre et l'humeur, puis mixé sous la voix. Aucun appel externe. |
| Brouillons générés (audio) | **Réel, local à l'appareil** | Audio et métadonnées dans IndexedDB (`afm-studio`). Ni compte, ni synchronisation entre appareils, et la déconnexion ne les efface pas (hors de ce lot, voir section 9). |
| Crédits | **Réel côté interface, sans valeur de garde** | Portefeuille dans `localStorage` (20 crédits gratuits par mois, 5 par titre) : par appareil, modifiable depuis les outils du navigateur, indépendant du compte. Ce n'est **pas** un plafond de dépense. |
| Paiements, abonnements | **Absents** | Les formules et packs sont décrits mais rien ne s'achète. |
| Bouton « Enregistrer le brouillon » | **Inerte** | Aucun gestionnaire de clic. |
| Zone « Importer un audio », « Parcourir » | **Inerte** | Aucun gestionnaire ; le texte dit « le moteur audio se connecte plus tard ». |
| Compteurs « Titres 42 » et « Voix 6 » | **Valeurs écrites en dur** | Pas des statistiques réelles. |
| Liste « Vos brouillons et titres » | **Données de démonstration** (`data/mock`) | Versions et stems sont fictifs. |
| Bouton « Créer un titre » | **Inerte** | |
| Préparation (texte, genre, humeur, voix) | **Non conservée aujourd'hui** | État React seulement : perdu au rechargement et à la navigation vers `/auth`. |

## 4. Fournisseurs, dépendances et appels qui peuvent coûter de l'argent

Tous les appels payants passent par la passerelle IA de Lovable, avec la variable serveur `LOVABLE_API_KEY`
(présence et solde **inconnus** depuis ce dépôt ; je n'ai rien appelé).

| Route | Appels fournisseur par clic | Plafonds du code | Peut coûter |
|---|---|---|---|
| `POST /api/studio/generate` | **2** : un modèle de texte (refrain, 200 jetons au plus), puis une synthèse vocale (600 caractères au plus) | corps 8 Ko, 60 requêtes par minute et par instance | **Oui**, à chaque clic, y compris « Régénérer » |
| `POST /api/voice/speak` | 1 synthèse vocale (800 caractères au plus) | idem | **Oui** (lecture à voix haute) |
| `POST /api/voice/transcribe` | 1 transcription (audio de 6 Mo au plus, 120 s) | idem | **Oui** (dictée) |
| Mixage instrumental, IndexedDB, téléchargement WAV | aucun | | non |
| Supabase Auth (comptes) | aucun par génération | | non (plan Free ; l'envoi de mails dépend du fournisseur SMTP) |

**Exposition actuelle, indépendante des comptes.** Les trois routes n'identifient personne : ouvrir un compte ne les
protège pas. La vérification « même origine » peut être imitée par un script, le compteur de 60 requêtes par minute
est propre à une instance et se remet à zéro au redémarrage, et le portefeuille de crédits est côté navigateur. **Le
seul vrai plafond de dépense est le solde du fournisseur.** Un interrupteur manuel existait (`AI_ROUTES_PAUSED`, inactif par défaut) ; **depuis le lot A il est actif par
défaut** (voir la section 13) et je n'ai aucun moyen de connaître l'état réel du déploiement depuis ce dépôt. Aucune nouvelle tentative automatique n'existe dans le
client : un clic fait un appel, un second clic en fait un autre.

## 5. Pourquoi la préparation se perd aujourd'hui (constats dans le code)

1. Le formulaire est un état React local : rechargement ou navigation, tout est perdu (le texte par défaut revient).
2. Aucun contrôle de compte sur le studio ni sur l'appel : le clic appelle directement l'API.
3. Les pages de compte sont hors de la mise en page de l'application : aller sur `/auth/...` démonte le studio.
4. **Google quitte la page** (redirection complète) : seul un stockage du navigateur peut garder la préparation.
5. La destination après connexion existe seulement pour la **connexion** (`?redirect=`, chemins du site seulement).
   Le lien « Créer un compte » de la page de connexion **ne la transmet pas**, la page d'inscription et la page de
   confirmation n'ont **aucune destination** : après confirmation, le membre arrive à l'accueil ou à la bienvenue.
6. Le lien de confirmation peut s'ouvrir dans un **autre onglet ou sur un autre appareil** : une préparation gardée
   dans le navigateur d'origine n'y est pas.
7. La page de bienvenue est facultative (« Plus tard ») et garde la destination : elle ne bloque pas, mais ajoute
   une étape qu'il faut faire revenir au studio.

## 6. Périmètre minimal proposé

**Dedans**

- **P1. Préparation conservée sept jours sur cet appareil (D3).** Texte, genre, humeur et voix sont enregistrés dans
  le navigateur dès qu'ils changent. Enregistrement : version, propriétaire, date de dernière modification ; valeurs
  validées et bornées comme côté serveur (texte 600 caractères). **Durée de vie : sept jours après la dernière
  modification. Elle n'est pas effacée après une génération réussie** : le membre retrouve sa préparation pour
  régénérer ou la reprendre plus tard. Passé sept jours, elle disparaît d'elle-même. Si le stockage est bloqué, le
  studio fonctionne comme aujourd'hui, sans message d'erreur technique.
- **P2. Propriétaire de la préparation, déconnexion, autre compte (D3).**
  - Une préparation faite **sans compte** n'appartient à personne. Le clic sur Générer sans compte lui pose un
    **jeton de reprise** (valable 24 h, à valider) : le premier compte qui termine connexion, inscription ou
    confirmation **dans ce parcours** devient son propriétaire.
  - Une fois attribuée, **un autre compte ne peut ni la voir ni la reprendre** : chaque compte a son propre
    emplacement, et un compte sans emplacement trouve un studio vide. Sans jeton valide, une préparation anonyme n'est
    jamais attribuée à un compte qui se connecte pour une autre raison.
  - **À la déconnexion volontaire**, si une préparation existe, un **avertissement précède son effacement** : « Votre
    préparation sera effacée de cet appareil. » avec deux choix, **Se déconnecter et effacer** ou **Rester connecté**.
  - Une déconnexion qu'on ne peut pas annoncer (session expirée, déconnexion depuis un autre onglet) n'efface rien
    mais ne rend pas la préparation accessible à un autre compte ; elle expire au bout de sept jours.
  - Limite à dire clairement : cette séparation est **applicative**. Quelqu'un qui dispose des outils du navigateur
    sur le même profil peut lire le stockage local ; l'effacement à la déconnexion réduit ce risque, il ne le supprime
    pas.
- **P3. Clic sur Générer sans compte.** **Aucun appel à l'API.** La préparation est enregistrée de façon synchrone
  avec son jeton de reprise, un message court explique ce qui se passe (« Connectez-vous pour générer ; votre
  préparation est conservée »), puis le membre est envoyé à la connexion. Le lien vers l'inscription conserve la
  destination.
- **P4. Destination conservée et reprise sans génération automatique (D4).** Une destination validée
  (`safeRedirect`) est gardée dans le stockage du navigateur et suit : connexion, inscription, **confirmation par
  e-mail**, retour de Google, page de bienvenue, puis retour sur `/studio` (valable 24 h, effacée à l'arrivée). La
  préparation est **restaurée à l'identique** et signalée (« Préparation reprise »), avec un bouton pour l'effacer.
  **La génération démarre sur un clic explicite**, jamais automatiquement : un retour de Google, une confirmation ou un
  rechargement ne doivent jamais dépenser sans geste. L'avatar et les statuts restent **facultatifs** (« Plus tard »
  ramène au studio).
- **P5. Les trois routes payantes exigent une session vérifiée côté serveur (D1).** `generate`, `speak` et
  `transcribe` exigent un jeton de session Supabase (`Authorization: Bearer`), vérifié **côté serveur** auprès du
  service d'authentification avec la clé publique déjà présente dans `.env` (aucun secret nouveau), par une seule
  fonction partagée. Ordre : origine, pause manuelle, jeton, limite, corps. Sans jeton valide : 401, **avant** toute
  lecture du corps et tout appel fournisseur. Si le service d'authentification ne répond pas, la route **refuse**
  (fail closed, 503) et n'appelle pas le fournisseur. Côté navigateur, un petit appel commun joint le jeton et, sur
  401, tente une fois de renouveler la session avant d'envoyer le membre à la connexion.
  - Conséquence assumée : la **lecture à voix haute** (`ReadAloudButton`) et la **dictée** (`VoicePrompt`) demandent
    un compte. Sans compte, ces boutons n'appellent pas l'API et proposent de se connecter (six langues).
- **P6. Erreurs.** Voir la section 7.
- **P7. Textes trompeurs corrigés (D5).** Six langues, arabe de droite à gauche. Propositions en français et en anglais ;
  les autres langues suivent le même sens et sont à faire relire.

  | Aujourd'hui | Problème | Proposition |
  |---|---|---|
  | « … generate a real sung preview » (fin du texte anglais ; mêmes mots dans les autres langues) | La voix est une **voix de synthèse** qui lit le refrain ; elle ne chante pas | « Moteur IA connecté : générez un aperçu avec une voix de synthèse » / "AI engine connected: generate a preview with a synthetic voice" |
  | « AI credits exhausted. Add credits to continue. » (réponse du fournisseur) | Rien ne s'achète | « La génération est momentanément indisponible. Réessayez plus tard. » / "Generation is temporarily unavailable. Please try again later." |
  | « … you need {n}. Top up your studio. » (portefeuille local) | Aucune recharge n'existe | « Crédits gratuits insuffisants : il en faut {n}. Votre allocation gratuite se renouvelle chaque mois. » / "Not enough free credits: {n} needed. Your free allowance renews every month." |
  | Libellés « Ténor chaleureux », « Soprano », « Alto » | Suggèrent une voix chantée | À relire : parler de « style de voix » |

  Le message sur les droits (« vous conservez les droits ») est une affirmation juridique à faire valider avant toute
  ouverture publique ; il n'est pas modifié ici.

**Dehors** (non touchés) : paiements, quotas et crédits côté serveur (demandent une table, donc une migration, donc
un accord : voir section 8), synchronisation des brouillons audio entre appareils et leur effacement à la déconnexion,
bouton « Enregistrer le brouillon », import audio, statistiques et projets de démonstration, modèle musical réel,
publication, avatar et statuts (déjà facultatifs, inchangés), autres pages.

## 7. Gestion des erreurs et conservation de la préparation

**La préparation n'est jamais effacée par une erreur ni par une réussite** : seuls sa durée de vie (sept jours),
l'avertissement de déconnexion et le bouton « Effacer » la retirent.

| Cas | Ce que voit le membre | Crédit local débité |
|---|---|---|
| Pas de compte au clic | message puis connexion | non |
| Session refusée (401) | « Votre session a expiré », puis connexion, retour au studio | non |
| Service d'authentification injoignable (503) | « Service momentanément indisponible » | non |
| Aucune réponse (réseau) | message réseau, bouton actif | non |
| 402 solde du fournisseur épuisé | « La génération est momentanément indisponible », sans mention d'achat | non |
| 429 trop de demandes | « Réessayez dans un instant » | non |
| 503 pause manuelle | « Génération momentanément suspendue » | non |
| 413 ou 400 | message sur le champ concerné | non |
| 502 échec du fournisseur | « La génération a échoué, réessayez » | non |
| Stockage navigateur plein ou bloqué après génération | l'audio est dans la page mais n'a pas été gardé : le dire | non (débit **après** l'enregistrement) |

Point existant corrigé par le lot : le crédit local est aujourd'hui débité **avant** l'enregistrement du brouillon
audio ; si l'enregistrement échoue, le membre est débité sans titre conservé.

## 8. Essais payants : bloqués tant que les garde-fous ne sont pas en place (D2)

**Aucun essai payant** (génération, lecture à voix haute, dictée avec un vrai fournisseur) n'a lieu avant que **toutes**
ces conditions soient vraies :

1. **Quotas côté serveur par membre**, dans un stockage **partagé et persistant** (pas la mémoire d'une instance, qui
   se remet à zéro et n'est pas partagée). Cela demande une table et donc une **migration à faire approuver** : c'est
   le lot suivant, pas celui-ci.
2. **Plafond de dépense vérifiable** : une limite de dépense **réglée chez le fournisseur** (valeur relevée par le
   propriétaire), **plus** un compteur global journalier côté serveur lisible en lecture seule, qui coupe la
   génération au-delà d'un seuil. « Vérifiable » veut dire que je peux relire la valeur du plafond et l'état du
   compteur sans rien dépenser.
3. **Interrupteur de pause essayé** (`AI_ROUTES_PAUSED` ou équivalent) : la preuve qu'il arrête bien les appels.
4. **Accord écrit du propriétaire** pour un essai borné, avec un nombre d'appels annoncé à l'avance.

Découpage proposé : **lot A** (ce document) = protection des trois routes, préparation, parcours, textes, tests avec
fournisseurs simulés ; **lot B** = quotas serveur, plafond vérifiable, crédits par compte, migration approuvée.
**Entre A et B, rien de payant n'est essayé.** Les routes sont protégées par session, mais cela ne plafonne pas la
dépense d'un membre connecté : c'est le rôle du lot B.

## 9. Décisions restantes pour le propriétaire

1. **Autoriser le lot A** malgré la réserve sur le Lot 3 du dépôt.
2. **Jeton de reprise de 24 h** et **destination valable 24 h** : valeurs à valider.
3. **Pause des routes payantes** : décidée et réalisée au lot A, active par défaut (section 13.1). Reste à la vérifier sur
   le déploiement réel (section 13.3, point 1) ; l'ouvrir (`AI_ROUTES_PAUSED=0`) n'a de sens qu'après le lot B.
4. **Solde et plafond du fournisseur IA** à relever dans Lovable (condition 2 de la section 8).
5. **Brouillons audio générés** (IndexedDB) : les effacer aussi à la déconnexion ? Hors de ce lot, à décider.
6. **Confirmation sur un autre appareil** : la préparation ne suit pas (le membre retrouve un studio vide avec un
   message) tant qu'elle n'est pas rattachée au compte côté serveur.

## 10. Critères d'acceptation (lot A)

1. Sans compte, un clic sur Générer **n'envoie aucune requête** à `/api/studio/generate` ; la lecture à voix haute et
   la dictée n'appellent pas non plus leurs routes.
2. La préparation (texte, genre, humeur, voix) est identique avant le clic et après le retour, y compris après un
   rechargement, une inscription par e-mail avec confirmation (même navigateur) et un retour de Google.
3. Elle est **toujours là après une génération réussie** et expire sept jours après la dernière modification (test
   avec une horloge simulée : présente à 6 jours 23 h, absente à 7 jours).
4. La déconnexion volontaire affiche l'avertissement ; « Rester connecté » ne change rien, « Se déconnecter et
   effacer » efface la préparation.
5. **Un autre compte sur le même appareil ne voit ni ne reprend la préparation du premier** ; une préparation anonyme
   n'est attribuée qu'au compte du parcours qui a posé le jeton de reprise, avant expiration.
6. La destination `/studio` survit à : connexion, inscription, confirmation, Google, bienvenue ; une destination hors
   du site ou vers `/auth` est ignorée.
7. Au retour, **aucune génération ne part sans un clic**.
8. Les trois routes refusent sans jeton valide (401), refusent un jeton falsifié ou expiré, refusent (503) si le
   service d'authentification est injoignable, et **n'appellent jamais le fournisseur** dans ces trois cas (test qui
   compte les appels fournisseur : zéro).
9. Chaque ligne du tableau de la section 7 est couverte par un test ; aucun message n'affiche un détail technique,
   un code HTTP ni un texte brut du serveur.
10. Un stockage bloqué ou plein ne casse pas le studio.
11. L'avatar et les statuts restent facultatifs : « Plus tard » ramène au studio avec la préparation.
12. Les textes de la section 6 (P7) sont remplacés dans les six langues ; plus aucun écran ne parle de voix chantée
    ni d'achat de crédits.
13. Six langues, arabe de droite à gauche, aucun cadratin, identité visuelle inchangée.
14. Aucune nouvelle variable secrète, aucune migration, aucune dépendance payante.
15. **Aucun test n'atteint un vrai fournisseur** (section 11).
16. `tsc`, ESLint, tests et build au vert ; rapport de ce qui est **simulé** et de ce qui est **réel**.

## 11. Plan de test : fournisseurs simulés uniquement (D2)

- **Règle absolue** : les tests utilisent **exclusivement** de faux fournisseurs (passerelle IA simulée, service
  d'authentification simulé). Le banc de test **fait échouer** toute requête vers l'adresse réelle de la passerelle IA
  ou vers un hôte non prévu, pour qu'un oubli ne puisse pas coûter d'argent. Aucune clé de fournisseur n'est lue par
  les tests.
- Tests unitaires de la préparation (validation, bornes, durée de vie avec horloge simulée, propriétaire, jeton de
  reprise, stockage bloqué) et du contrôle du jeton, avec un faux service d'authentification.
- Tests de composants : clic sans compte, restauration, message de reprise, avertissement de déconnexion, chaque erreur,
  lecture à voix haute et dictée sans compte.
- Parcours en navigateur contre le **simulateur d'authentification** déjà utilisé (inscription, confirmation, Google
  simulé) et une route de génération simulée.
- **Aucun essai réel payant** dans ce lot (section 8). Le rapport indiquera en toutes lettres ce qui reste simulé.

## 12. Ce que cette analyse n'a pas pu établir

Présence de `LOVABLE_API_KEY` et solde du fournisseur ; état de `AI_ROUTES_PAUSED` ; tarif des modèles ; qualité réelle
du résultat sonore (aucun appel fait) ; comportement exact du contrôle de jeton sur la plateforme d'hébergement avant
d'avoir été essayé ; existence d'un plafond de dépense réglable chez le fournisseur.

## 13. Réalisation du lot A (2026-10-26)

*Section écrite à la fin du lot A, sur la branche `feat/studio-lot-a` (depuis `origin/main`, avec le commit
documentaire repris par cherry-pick). Aucun appel payant, aucune migration, aucun changement distant. Les preuves
sont rangées en trois catégories, à ne pas confondre : **preuves locales** (le code réel, exécuté ici),
**simulations** (un faux service à la place du vrai) et **vérifications distantes encore nécessaires** (ce que
seule la plateforme réelle peut dire).*

### 13.1 État livré : les trois routes payantes sont en pause par défaut

| Contexte | Où s'exécutent les routes | Lecture de la variable |
|---|---|---|
| Aperçu Lovable et serveur local | serveur de développement (Vite, Node) | `process.env.AI_ROUTES_PAUSED`, relu à **chaque requête** |
| Site publié | **Worker Cloudflare** (préréglage Nitro `cloudflare`, `wrangler.json` généré : `nodejs_compat`, date de compatibilité 2026-10-25) | même lecture de `process.env` |

**Règle livrée (`src/lib/api-guard.ts`) : les routes sont en pause, sauf si le serveur dit explicitement le
contraire.** Variable absente, vide, environnement que la plateforme ne transmet pas, ou valeur inconnue : **503
`ai_paused`**, avant tout contrôle de session et tout appel fournisseur. Seules les valeurs `0`, `false`, `no` et
`off` (insensibles à la casse) ouvrent les routes. Ouvrir est donc un geste volontaire, à ne faire qu'après le lot B
(quotas serveur, plafond de dépense vérifiable). L'ordre du garde : origine, **pause**, session, limite, corps.

Conséquence assumée : dans l'état livré, la génération, la lecture à voix haute et la dictée répondent « momentanément
en pause » à tout le monde, y compris aux membres connectés. C'est le but : **aucun appel payant n'est possible sans
décision écrite**. Avec la variable absente, rien à configurer pour être protégé.

**Pour ouvrir les routes plus tard (pas maintenant) :** ajouter une variable serveur `AI_ROUTES_PAUSED` à `0` (sans
préfixe `VITE_`), puis Publish puis Update ; pour refermer, supprimer la variable (ou lui donner `1`).

### 13.2 Ce qui a été réalisé

- **Pause par défaut** (voir 13.1), avec une garantie testée par des fournisseurs simulés.
- **Session vérifiée côté serveur sur les trois routes** (`src/lib/member-guard.ts`) : `Authorization: Bearer`,
  contrôlé auprès du service d'authentification (`GET /auth/v1/user`, clé publique de `.env`, aucun secret), avant la
  lecture du corps et avant tout appel fournisseur. Sans jeton ou jeton malformé : 401, sans appel réseau. Jeton
  refusé : 401. Service injoignable, en erreur, en retard (4 s) ou réponse illisible : 503 `auth_unavailable` (échec
  fermé). Le jeton n'est ni journalisé, ni renvoyé, ni transmis au fournisseur.
- **Appel côté navigateur** (`src/lib/ai-fetch.ts`) : joint le jeton ; sans session, n'envoie rien ; sur 401, renouvelle
  la session une fois et réessaie une fois. Lecture à voix haute et dictée : sans compte, aucune requête (la dictée
  n'ouvre même pas le micro).
- **Préparation conservée sept jours sur l'appareil** (`src/studio/prep.ts`) : enregistrée à chaque changement,
  restaurée à l'ouverture, **conservée après une génération réussie**, sept jours après la dernière modification
  (ouvrir le studio ne la prolonge pas), un emplacement par compte, jeton de reprise de 24 h posé par le clic sur
  Générer, texte tapé avant que la session soit connue jamais écrasé.
- **Changement de compte dans la page** : le formulaire prend la préparation du nouveau compte (ou le défaut) ; il
  n'emporte jamais les mots du compte précédent. *Défaut trouvé pendant la consolidation (par un test) et corrigé :
  les mots tapés par un compte étaient recopiés dans l'emplacement du suivant.*
- **Destination de reprise 24 h** (`src/auth/returnTo.ts`) : survit à l'inscription, à la confirmation par e-mail
  (même navigateur), à Google et à la bienvenue ; chemins du site hors `/auth` seulement ; utilisée une fois.
- **Clic sur Générer sans compte** : aucune requête, préparation enregistrée avec son jeton, envoi à la connexion. **Au
  retour, aucune génération automatique** : bandeau « Préparation reprise » et bouton Effacer.
- **Brouillons audio générés** (consolidation) : ils contiennent le prompt, les paroles et l'audio de l'utilisateur, donc
  des données personnelles. Ils appartiennent désormais à un compte (`ownerId`) ; un autre compte ne les voit pas, même
  si la première session s'est terminée sans déconnexion ; ceux d'avant les comptes sont repris par le premier compte
  qui ouvre le studio. **À la déconnexion volontaire, ils sont effacés** : disque (IndexedDB, ce compte seulement),
  références en mémoire, **adresses temporaires révoquées**, et le lecteur s'arrête et oublie ces titres. La fenêtre
  d'avertissement cite aussi les titres générés ; elle s'affiche même pendant que la liste se charge.
- **Réponse tardive** : une génération qui revient après une déconnexion, ou après qu'un autre compte s'est connecté,
  n'affiche rien, ne garde rien, ne débite rien : ni dans le studio, ni dans le magasin (ce qu'elle aurait écrit sur
  le disque est supprimé aussitôt). La liste lue sur le disque après une déconnexion n'est pas remise à l'écran.
- **Textes trompeurs corrigés** dans les six langues : plus de « chanté » (voix de synthèse), plus d'achat ni de
  recharge de crédits ; nouveaux textes de session, de reprise et d'erreur.
- **Crédit local débité après l'enregistrement** ; un titre que l'appareil ne peut pas garder reste écoutable et
  téléchargeable, avec un message, sans débit, et son adresse temporaire est révoquée à la déconnexion.
- **Débordement horizontal à 375 px corrigé** (`min-w-0` sur les cartes de projets et de titres générés, sans refonte) :
  la liste de projets de démonstration élargissait la page.
- **Banc de test** (`src/test/networkGuard.ts`) : toute requête vers un hôte réel échoue avant d'utiliser le réseau ;
  la clé du fournisseur est retirée de l'environnement des tests.

### 13.3 Preuves, par catégorie

**Preuves locales (le code réel, exécuté ici)**

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit`, ESLint (fichiers modifiés), `vite build` | 0 erreur, 0 erreur (1 avertissement de plus du même type que ceux qui existaient : un second hook exporté à côté d'un composant), succès |
| Suite de tests | **1 023 sur 1 023**, 47 fichiers, deux passes complètes. Une première passe a vu deux tests qui parcourent tout le dépôt dépasser leur délai de 5 s sous charge ; le mien a reçu un délai explicite, l'autre (`credits-free`) est connu et passe seul |
| **Vingt et une dégradations volontaires** du code (neuf du premier temps, douze de la consolidation : routes ouvertes sans configuration, valeur inconnue ou vide qui ouvre, disque non effacé, réponse tardive gardée, tous les comptes voient tous les titres, adresses non révoquées, lecteur qui continue, mots d'un compte recopiés chez le suivant, avertissement qui ignore les titres) | chacune détectée par au moins un test, fichiers rétablis à l'identique |
| Pause locale, deux serveurs de développement, corps vides, aucune clé fournisseur | avec `AI_ROUTES_PAUSED=1` : 503 `ai_paused` sur les trois routes, même sans jeton ; sans variable (code d'avant la consolidation) : 401 |
| IndexedDB réel (Chrome) | l'effacement à la déconnexion vide les titres du compte et laisse ceux d'un autre compte (parcours F2 ci-dessous) |
| Navigateur réel, serveur local, adresse sans session | clic sur Générer d'un visiteur : aucune requête `/api/` |

**Simulations (un faux service à la place du vrai)**

- **Parcours complets dans Chrome réel (37 contrôles sur 37)** contre un faux service d'authentification, un faux
  Google et une fausse boîte mail, sans aucun fournisseur IA joignable :
  - *F1 Google* : préparation d'un visiteur, Générer, connexion, retour de Google, bienvenue « Plus tard », studio,
    **préparation restaurée à l'identique avec son bandeau, aucune génération, aucune requête aux routes payantes** ;
  - *F2 changement de compte volontaire* : avertissement, « Rester connecté » n'efface rien, « Se déconnecter et
    effacer » vide la préparation et les titres du compte (un autre compte garde les siens), un second compte voit un
    studio vierge ;
  - *F3 changement sans déconnexion* : un autre compte ne voit ni la préparation ni les titres du premier ; le premier
    les retrouve en se reconnectant ;
  - *F4 expiration* : un jeton de reprise de plus de 24 h ne donne rien au compte qui se connecte ; une préparation de
    plus de sept jours n'est pas restaurée et est supprimée ;
  - *F5 inscription et confirmation par e-mail* : lien de la boîte simulée, page de confirmation, bienvenue, studio,
    préparation intacte, aucune génération ;
  - *F6 annulation chez Google* : retour à la connexion avec un message simple, préparation et jeton intacts, nouvel
    essai réussi ;
  - *F7* bouton « Effacer la préparation » ; *F8* aucun débordement horizontal du studio à 375 px.
- Les routes IA, le garde, le magasin de titres, la fenêtre de déconnexion et le lecteur sont aussi testés (tests
  automatiques) avec un faux fournisseur, un faux service d'authentification et un faux disque : **rien de réel n'a été
  appelé**.

**Vérifications distantes encore nécessaires (rien de tout cela n'est prouvé)**

1. **La pause par défaut sur la plateforme réelle.** Sur le site publié **et** sur l'aperçu, un `curl` à corps vide sur
   les trois routes doit répondre `503` avec `"code":"ai_paused"` sans qu'aucune variable ne soit définie :

```bash
curl -s -i -X POST "https://<adresse du site>/api/studio/generate" \
  -H "Content-Type: application/json" -H "Sec-Fetch-Site: same-origin" -d "{}"
```

   Refaire sur `/api/voice/speak` et `/api/voice/transcribe`. Ne jamais envoyer de prompt ni de texte pour ce test.
   Tant que ce n'est pas fait, la garantie vaut pour le code livré, pas pour le déploiement. (Si le site publié est
   encore sur la version d'avant ce lot, la réponse sera 400 ou 401 : c'est la preuve qu'il faut publier ce lot.)
2. **L'aperçu et le site Lovable avec le vrai projet** : connexion Google dans un onglet séparé, inscription et
   confirmation par e-mail réelles jusqu'au studio, préparation restaurée. Seuls des faux services ont été exercés.
3. **Le Worker joint-il le vrai service d'authentification ?** Le contrôle de session part du Worker vers le projet
   Supabase : non essayé. S'il échoue, les routes répondent 503 `auth_unavailable` (fermées), donc sans risque mais
   inutilisables une fois ouvertes.
4. **Navigateurs autres que Chrome** (Safari, Firefox, mobiles) : l'effacement d'IndexedDB et la révocation des adresses
   n'ont été vus que dans Chrome.
5. **Côté fournisseur IA** : solde et plafond de recharge à relever avant d'ouvrir les routes (lot B).

### 13.4 Limites

- **Stockage local** : la séparation entre comptes est celle de l'application, pas une frontière de sécurité. Les
  outils du navigateur sur le même profil lisent tous les emplacements. Une session qui se termine sans déconnexion
  volontaire laisse la préparation et les titres jusqu'à leurs sept jours (la préparation) ou jusqu'à la prochaine
  déconnexion volontaire du compte (les titres), lisibles seulement par leur compte dans l'application. Rien ne quitte
  le navigateur : un autre appareil ou navigateur repart à vide, et un lien de confirmation ouvert ailleurs ne
  retrouve ni préparation ni destination. Navigation privée ou stockage bloqué : rien n'est gardé.
- **Titres d'avant les comptes** : le premier compte qui ouvre le studio les reprend. Sur un appareil partagé, ce n'est
  pas forcément leur auteur.
- **Favoris et listes de lecture** qui citent un titre effacé gardent un identifiant sans titre derrière (aucune donnée
  du titre ne reste) ; non nettoyé ici.
- **Pas de plafond de dépense** : la session vérifiée ne limite pas ce qu'un membre connecté dépense une fois les
  routes ouvertes. Le compteur de 60 requêtes par minute est propre à une instance ; le portefeuille de crédits est
  local et modifiable. Quotas par membre, plafond vérifiable et crédits par compte restent le **lot B** (table,
  migration à approuver). **Les essais payants restent bloqués** jusqu'à ce lot.
- **Une vérification de session par appel** : un aller-retour vers le service d'authentification ; s'il est en panne,
  la génération est refusée (voulu).
- Non fait : libellés de voix (« Ténor chaud », « Soprano »), message sur les droits, relecture native des textes ZH, PT
  et AR (premiers jets), nettoyage des listes de lecture.
- Un avertissement de lint de plus (`react-refresh/only-export-components`) : le magasin de titres exporte maintenant
  deux hooks à côté de son composant, comme le lecteur en exporte déjà deux.
