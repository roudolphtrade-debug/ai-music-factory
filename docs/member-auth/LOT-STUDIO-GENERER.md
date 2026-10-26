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
seul vrai plafond de dépense est le solde du fournisseur.** Un interrupteur manuel existe (`AI_ROUTES_PAUSED`) ; je
n'ai aucun moyen de connaître son état réel depuis ce dépôt. Aucune nouvelle tentative automatique n'existe dans le
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
3. **Le plus tôt possible, en attendant le lot A** : les trois routes sont aujourd'hui ouvertes sans compte. Faut-il
   activer la pause manuelle (`AI_ROUTES_PAUSED`) dans Lovable jusqu'à la livraison ? Cela coupe aussi la lecture à
   voix haute et la dictée existantes. Je ne l'active pas moi-même.
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
