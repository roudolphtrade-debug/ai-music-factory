# Parcours manuel du membre sur aimf-dev

À faire par le propriétaire, avec sa propre adresse e-mail et son propre mot de passe, sur l'application
locale reliée au projet **aimf-dev** (`liewjcwkogoesgxcuyff`). Aucun automate ne crée de compte : tout se
saisit à la main. **Aucun résultat de ce document n'a encore été obtenu sur le vrai projet** : c'est la
feuille de route du premier essai réel.

URL locale : **http://localhost:8080** (le port compte : il doit figurer dans les URLs de redirection).

## 0. Avant de commencer

### 0.1 La clé publique (à saisir par le propriétaire)

*État au 2026-10-25 : la clé publique d'aimf-dev a été saisie dans `.env.local` et le contrôle 0.3 passe (8 sur 8). Cette section reste valable pour refaire l'opération sur une autre machine.*

1. Ouvrir le fichier `.env.local` à la racine du projet (il existe déjà, ignoré par Git).
2. Dans le tableau de bord Supabase : **Project Settings, API Keys**. Copier la clé **publishable**
   (`sb_publishable_…`). **Pas** la clé secrète, **pas** `service_role`.
3. La coller après `VITE_SUPABASE_PUBLISHABLE_KEY=` (sans guillemets), enregistrer.
4. `VITE_SUPABASE_URL` est déjà renseignée : `https://liewjcwkogoesgxcuyff.supabase.co`.

La clé publique est visible par tout visiteur du site : ce n'est pas un secret, mais elle reste hors du
dépôt. Si une clé secrète est collée par erreur, le contrôle ci-dessous la refuse sans l'utiliser ;
la retirer aussitôt du fichier.

### 0.2 Réglages à relire dans Supabase (Authentication)

Rien n'a pu être vérifié depuis ce dépôt. À contrôler avant le premier essai :

| Réglage | Valeur attendue |
|---|---|
| URLs de redirection | contient `http://localhost:8080/**` |
| Site URL | une adresse valable (le lien d'un mail retombe dessus si la redirection est refusée) |
| Confirmation d'adresse | activée (le contrôle ci-dessous le lit) |
| Longueur minimale du mot de passe | 12 |
| SMTP personnalisé (Sawaz) | configuré dans **Authentication, SMTP Settings** ; sans cela, Supabase limite fortement l'envoi |

### 0.3 Contrôle de connexion en lecture seule

Dans le dossier du projet :

```bash
node supabase/preflight.mjs
```

Il n'envoie que des requêtes de lecture, ne crée aucun compte, n'envoie aucun mail et n'affiche jamais
la clé. Il doit afficher « All checks passed » : projet attendu, clé publique acceptée, inscription par
e-mail activée, confirmation par e-mail exigée, table `profiles` présente et illisible par un visiteur.
Code de sortie 2 : clé absente. Code 3 : clé refusée (secrète ou illisible).

### 0.4 Lancer l'application

```bash
npm run dev
```

Les variables sont lues **au démarrage** : après toute modification de `.env.local`, arrêter le serveur
(Ctrl+C) et le relancer. Ouvrir http://localhost:8080/auth/sign-up : le formulaire d'inscription doit
s'afficher. Si la page dit « Comptes momentanément indisponibles », la clé est vide ou le serveur n'a pas
été relancé.

## 1. Précautions

- Saisir soi-même l'adresse et le mot de passe ; ne les donner à personne, ne pas les coller dans une
  conversation.
- **Ne jamais copier ni partager le lien de confirmation ou de récupération, ni une capture qui montre
  la barre d'adresse après un clic dessus** : après le `#`, l'adresse contient des jetons de session.
  Ne pas partager non plus un export de l'onglet Réseau des outils de développement.
- L'application n'écrit aucun jeton, mot de passe ou lien dans la console (un test automatisé le vérifie).
- Utiliser une boîte e-mail dont on est propriétaire, et supprimer le compte de test à la fin (étape 10).

## 2. Les étapes

Noter pour chaque étape ce qui s'est passé (tableau en fin de document). Les messages sont en français si
la langue de l'application est le français.

### Étape 1. Inscription (`/auth/sign-up`)

1. Saisir son adresse et un mot de passe qui respecte les règles affichées sous le champ : 12 caractères au moins, une majuscule, une minuscule, un chiffre et un caractère spécial. Les règles se cochent à mesure de la saisie ; un mot de passe collé ou proposé par un gestionnaire de mots de passe est accepté.
2. Cliquer sur **Créer mon compte**.

Attendu : l'écran « Vérifiez votre boîte » affiche l'adresse saisie ; le bouton de renvoi décompte 60 s ;
personne n'est connecté (le bouton **Se connecter** reste en haut à droite).
Voir aussi : un mot de passe de 11 caractères est refusé avant tout envoi.

### Étape 2. Réception du mail

Attendu : un message de confirmation arrive, de l'expéditeur configuré (Sawaz). **À relever** : délai
d'arrivée, dossier (boîte ou spam), expéditeur, objet, langue du texte.
Sans cliquer, survoler le lien : l'hôte doit être `liewjcwkogoesgxcuyff.supabase.co`, avec une redirection
vers `http://localhost:8080/auth/confirm`. Ne pas copier le lien.
Si rien n'arrive : attendre le décompte, utiliser **Renvoyer**, regarder les journaux dans **Authentication,
Logs** ; ne pas multiplier les essais (limites d'envoi).

### Étape 3. Confirmation

1. Cliquer sur le lien du mail, dans le même navigateur.

Attendu : retour sur http://localhost:8080 puis arrivée sur la page de **bienvenue** (nouveau membre) ; le
haut de page affiche le nom (la partie de l'adresse avant le @) à la place de « Se connecter ».
Facultatif : renseigner un nom, un pseudo, un statut, puis **Entrer dans la fabrique** (ou **Plus tard**).
Ouvrir le lien dans un autre navigateur est aussi permis : il doit confirmer et connecter ce navigateur-là.

### Étape 4. Le profil dans la base

Dans **Table Editor, profiles** : une seule ligne pour ce compte, créée par le trigger, `display_name` égal à
la partie de l'adresse avant le @ (ou au nom saisi). Dans **Paramètres** de l'application : les mêmes
valeurs, l'adresse du compte, et les statuts artiste et label sélectionnables ensemble ou pas du tout.

### Étape 5. Persistance

1. Recharger la page (F5).
2. Fermer l'onglet, rouvrir http://localhost:8080.

Attendu : toujours connecté, sans nouvelle saisie, nom affiché.

### Étape 6. Déconnexion

1. Menu du compte, **Se déconnecter**.

Attendu : retour au bouton **Se connecter** ; après rechargement, toujours déconnecté ; la page Paramètres
invite à se connecter au lieu d'afficher un profil.

### Étape 7. Connexion

1. `/auth/sign-in` : saisir un mauvais mot de passe. Attendu : message neutre, sans texte technique.
2. Saisir le bon. Attendu : connexion et arrivée sur l'accueil (l'accueil de bienvenue n'est plus
   proposé si on l'a terminé ou ignoré).

### Étape 8. Récupération du mot de passe

1. Déconnecté, `/auth/forgot-password` : saisir l'adresse. Attendu : réponse neutre (la même pour une
   adresse inconnue).
2. Ouvrir le mail de récupération (mêmes relevés qu'à l'étape 2), cliquer sur le lien. Attendu : le
   formulaire de nouveau mot de passe s'ouvre.
3. Saisir un nouveau mot de passe qui respecte les mêmes règles (différent de l'ancien) deux fois. Attendu :
   connecté.
4. Se déconnecter, se reconnecter avec le nouveau mot de passe ; l'ancien doit être refusé.

### Étape 9. Cas limites (facultatifs)

- Ouvrir une deuxième fois un lien déjà utilisé : message de lien expiré ou invalide et possibilité de
  demander un nouveau lien (jamais de texte technique).
- Si le lien est « expiré » dès le premier clic alors que le mail est récent : un antivirus ou un filtre de
  messagerie l'a probablement ouvert avant vous. Demander un nouveau lien et noter le fournisseur de
  messagerie.
- S'inscrire une seconde fois avec la même adresse : écran « Vérifiez votre boîte » identique, sans révéler
  que le compte existe.

### Étape 10. Nettoyage

Dans **Authentication, Users** : supprimer le compte de test. Vérifier dans **Table Editor, profiles** que sa
ligne a disparu avec lui. Retirer la clé de `.env.local` seulement si on ne veut plus du raccordement local.

## 3. Relevé

| Étape | Résultat (ok, écart, bloqué) | À noter |
|---|---|---|
| 0.3 contrôle de connexion | | |
| 1 inscription | | |
| 2 mail : délai, expéditeur, hôte du lien | | |
| 3 confirmation et bienvenue | | |
| 4 profil dans la base | | |
| 5 persistance après rechargement | | |
| 6 déconnexion | | |
| 7 connexion, mauvais mot de passe | | |
| 8 récupération et nouveau mot de passe | | |
| 9 cas limites | | |
| 10 suppression du compte de test | | |

## 4. Si quelque chose ne va pas

| Symptôme | Cause probable | Piste |
|---|---|---|
| « Comptes momentanément indisponibles » | clé vide, ou serveur non relancé | remplir `.env.local`, relancer `npm run dev` |
| `preflight` : clé refusée (HTTP 401) | clé incomplète ou d'un autre projet | recopier la clé publishable d'aimf-dev |
| `preflight` : table introuvable | migration absente sur ce projet | ne pas réappliquer sans accord : vérifier le projet |
| Aucun mail | SMTP non fonctionnel, limite d'envoi, spam | Authentication, Logs et SMTP Settings |
| Le lien retombe sur la mauvaise page | URL de redirection absente | ajouter `http://localhost:8080/**` |
| Lien expiré tout de suite | prélecture par un filtre de messagerie | renvoyer, noter le fournisseur |
| Mot de passe refusé | une règle manque (le message dit laquelle) ou plus de 72 octets | compléter ce qui manque |
| Connecté puis déconnecté au rechargement | stockage du navigateur bloqué | autoriser le stockage local pour localhost |

## 5. Ce que l'on peut me transmettre

Le relevé de la section 3, les messages d'erreur affichés à l'écran, l'heure approximative des essais,
et les lignes de **Authentication, Logs** sans adresse ni lien. **Jamais** un lien du mail, un jeton, un mot
de passe, ni une capture montrant la barre d'adresse après un lien.

## 6. Diagnostiquer l'échec d'une inscription

L'écran affiche volontairement un message neutre (« Une erreur est survenue », « Connexion impossible »…) :
il ne dit pas **quelle** panne s'est produite. Pour trancher entre trois cas, relever trois choses, **sans
jamais copier le mot de passe, un jeton, un lien ni l'adresse e-mail** :

1. **La requête** (navigateur, outils de développement, onglet Réseau) : la ligne `signup`, requête vers
   `liewjcwkogoesgxcuyff.supabase.co/auth/v1/signup`. Relever le **statut HTTP**, et dans l'onglet
   **Réponse** uniquement `error_code` et `msg`. **Ne pas ouvrir ni copier l'onglet « Charge utile »**
   (il contient le mot de passe) ni les en-têtes de la requête.
2. **La trace sans secret de l'application** (développement local seulement, après une **nouvelle**
   tentative : l'ancienne n'a pas été enregistrée) : dans la console du navigateur,
   `copy(JSON.stringify(window.__afmAuthDiagnostics))`. Chaque entrée ne contient que l'heure, l'opération,
   la catégorie (`network`, `service_refusal`, `smtp`, `service_error`, `unknown`), le statut HTTP et le
   code d'erreur : jamais le message, l'adresse, le mot de passe ni un jeton (des tests le vérifient).
3. **Les journaux Auth du projet** (tableau de bord, **Logs** puis **Auth**, ou **Authentication, Logs**), à
   l'heure de l'essai. Les journaux sont en UTC : noter l'heure locale et le fuseau. Relever la ligne
   `/signup` : statut, `error_code`, `msg`, et pour un échec de mail la cause sous-jacente (authentification
   refusée, connexion refusée, délai dépassé, TLS). Masquer l'adresse avant de montrer quoi que ce soit.

| Cas | Ce que l'on voit côté navigateur | Ce que l'on voit dans les journaux Auth | À faire |
|---|---|---|---|
| **Problème réseau** | aucune réponse HTTP : requête « failed », `ERR_…`, blocage CORS ; catégorie `network`, statut 0 ou absent | **rien** à l'heure de l'essai (la requête n'est pas arrivée) | vérifier la connexion, un VPN, un proxy, un bloqueur de publicités ; relancer `node supabase/preflight.mjs` |
| **Refus du service** (4xx) | statut 400, 401, 403, 422 ou 429 avec un `error_code` ; catégorie `service_refusal` | une ligne `/signup` avec ce statut et ce code | lire le code ci-dessous |
| **Échec SMTP** | statut **500**, `error_code` `unexpected_failure`, message du type « Error sending confirmation email » ; catégorie `smtp` | une ligne `/signup` en 500 « Error sending confirmation email », avec la cause du serveur de mail | corriger **Authentication, SMTP Settings** (hôte, port, utilisateur, expéditeur, TLS), puis réessayer |
| **Autre erreur du service** (5xx) | statut 500 ou 502 à 504 sans mot sur le mail ; catégorie `service_error` | ligne en 5xx ; « Database error saving new user » désigne le trigger de création du profil | lire le message exact dans les journaux ; ne pas réappliquer la migration sans accord |

Codes de refus fréquents (`error_code`) :

| Code | Sens | Piste |
|---|---|---|
| `over_email_send_rate_limit` (429) | trop de mails envoyés dans l'heure | attendre ; la limite est très basse sans SMTP personnalisé |
| `email_address_not_authorized` (400) | le service de mail par défaut n'écrit qu'aux membres de l'équipe du projet | configurer le SMTP Sawaz, ou tester avec une adresse de l'équipe |
| `signup_disabled` ou `email_provider_disabled` | inscriptions fermées | Authentication, Sign In / Providers |
| `email_address_invalid` ou `validation_failed` | adresse refusée par le service (domaine, forme) ; ou adresse de redirection refusée | essayer une autre adresse ; relire les URLs de redirection |
| `weak_password` (422) | mot de passe refusé par les règles du projet ; la raison `pwned` signale un mot de passe issu de fuites (contrôle payant) | règles : voir `supabase/README.md` section 3.1 |
| 401 ou 403 | clé refusée | relancer le contrôle de connexion (étape 0.3) |

Deux précisions. **Après un échec d'envoi, un compte non confirmé peut exister ou non** selon la version du service : vérifier
dans **Authentication, Users** s'il y a une ligne pour l'adresse, et la supprimer avant de recommencer. **Si l'inscription répond 200 mais qu'aucun mail n'arrive**, ce n'est ni un échec réseau ni un
refus du service : regarder les journaux d'envoi du fournisseur de mail (Sawaz), le dossier spam, puis
l'authentification de l'expéditeur du domaine. La catégorie `smtp` repose sur le texte de l'erreur du
service : si sa formulation change, elle retombe sur `service_error`, et seuls les journaux Auth tranchent.

## 7. Relevé du premier parcours réel (2026-10-25)

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

## 8. Règles du mot de passe : réglages Supabase

- **Règles du mot de passe côté service** (longueur 12, majuscule, minuscule, chiffre, symbole) : réglage gratuit
  enregistré par le propriétaire dans Authentication, Sign In / Providers, Email. **Prouvé le 2026-10-25** par cinq
  appels directs à l'inscription (trop court, sans majuscule, sans minuscule, sans chiffre, sans symbole), tous
  refusés en 422 `weak_password`, sans compte créé. Étapes et requête de vérification : `supabase/README.md`,
  section 3.1.
- **Non testé séparément** : le refus côté service lors de la réinitialisation (il demande une session de
  récupération).
- **Refus des mots de passe courants ou issus de fuites** : possible seulement avec le contrôle des mots de
  passe compromis, réservé au plan Pro et supérieurs (payant). **Inactif**, rien n'a été souscrit : un mot de passe
  courant qui respecte les règles reste accepté.

## 9. Connexion avec Google

Le bouton « Continuer avec Google » n'apparaît que si le projet annonce Google actif (`node supabase/preflight.mjs`
le dit ; aujourd'hui : actif). Configuration : `supabase/README.md`, section 3.2.

Parcours à rejouer (avec un compte Google qui vous appartient) :

1. Ouvrir `/auth/sign-in`, cliquer sur **Continuer avec Google**, choisir le compte. Attendu : retour dans l'application,
   connecté (un nouveau membre arrive sur la page de bienvenue).
2. Recharger la page. Attendu : toujours connecté.
3. Se déconnecter. Attendu : retour à l'état déconnecté.
4. Se reconnecter avec Google. Attendu : **le même profil** (même nom affiché, pas de nouvelle page de bienvenue, pas de
   second profil dans Table Editor, `profiles`).

Rapporté par le propriétaire le 2026-10-25 : les quatre étapes réussies. Relevé en lecture seule après coup : un seul
compte Google et un seul profil de plus qu'avant, aucun utilisateur sans profil (détail : `BILAN.md`, section 14). Le
maintien après rechargement et la déconnexion restent déclaratifs.

Si Google renvoie une erreur de redirection : vérifier que l'adresse de la page figure dans Authentication, URL
Configuration (motif `.../**`) et dans les origines autorisées du client Google.
