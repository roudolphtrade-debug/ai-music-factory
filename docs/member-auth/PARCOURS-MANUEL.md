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

1. Saisir son adresse et un mot de passe d'au moins 12 caractères.
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
3. Saisir un nouveau mot de passe (12 caractères ou plus, différent de l'ancien) deux fois. Attendu :
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
| Mot de passe refusé | moins de 12 caractères ou plus de 72 octets | choisir un mot de passe plus long, ou plus court |
| Connecté puis déconnecté au rechargement | stockage du navigateur bloqué | autoriser le stockage local pour localhost |

## 5. Ce que l'on peut me transmettre

Le relevé de la section 3, les messages d'erreur affichés à l'écran, l'heure approximative des essais,
et les lignes de **Authentication, Logs** sans adresse ni lien. **Jamais** un lien du mail, un jeton, un mot
de passe, ni une capture montrant la barre d'adresse après un lien.
