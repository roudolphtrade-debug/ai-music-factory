# Exigences avant ouverture publique, et parcours ultérieur validé

Ce document fixe ce qui reste à faire autour du lot membre. **Rien de ce qui suit n'est implémenté
dans le lot actuel.**

## 1. Exigence bloquante : suppression autonome du compte

**Avant toute ouverture publique, un membre doit pouvoir supprimer lui-même son compte et ses
données depuis l'application, sans demander au propriétaire.** C'est le droit à l'effacement (RGPD) ;
tant qu'il n'est pas couvert, l'application ne s'ouvre pas à des personnes extérieures à l'équipe.

État actuel : la ligne de profil disparaît avec le compte (`on delete cascade`, vérifié), mais seul le
propriétaire peut supprimer un compte, depuis **Authentication → Users** du tableau de bord. Ce
contournement est acceptable pour des comptes de test internes uniquement.

Critères d'acceptation :

1. **Fonction côté serveur.** La suppression d'un utilisateur exige les droits d'administration du
   service d'authentification. Elle s'exécute donc dans une fonction serveur (fonction Edge, ou
   équivalent) appelée par le membre connecté. La clé secrète reste dans l'environnement de cette
   fonction : jamais dans le navigateur, jamais dans le dépôt.
2. **Seul le membre concerné.** La fonction supprime l'utilisateur identifié par son propre jeton,
   jamais un identifiant fourni par la requête.
3. **Confirmation explicite** : saisie du mot de passe ou d'un mot de confirmation, avec un message
   qui dit ce qui sera effacé et que c'est définitif.
4. **Effacement complet** : profil, et toute donnée liée au compte ajoutée plus tard (chaque nouvelle
   table liée à `auth.users` prévoit `on delete cascade` ou son propre effacement). Les données
   locales de l'appareil restent à l'utilisateur, l'interface le dit.
5. **Sessions révoquées** sur tous les appareils ; l'appareil retourne en visiteur.
6. **Journal sans donnée personnelle** (pas d'adresse e-mail dans les traces).
7. **Tests** : après suppression, la connexion échoue, le profil n'existe plus, une autre personne
   n'est pas touchée, l'adresse peut être réutilisée pour une nouvelle inscription. Mutation :
   retirer la cascade ou accepter un identifiant venu de la requête doit faire échouer un test.
8. Documenté dans `supabase/README.md`, vérifié une fois sur aimf-dev avec un compte de test, sans
   toucher à un compte réel.

## 2. Parcours ultérieur validé : préparer sans compte, s'inscrire à « Générer »

Parcours décidé par le propriétaire, **à réaliser dans un lot distinct**. Le lot membre actuel n'en
contient que les fondations (inscription, profil, découverte publique et données locales conservées
sans attribution automatique).

Principe : une personne peut préparer sa musique sans compte ; le compte n'est demandé qu'au moment
de **Générer**, et ce qu'elle a saisi n'est pas perdu.

| Étape | Comportement attendu |
|---|---|
| Préparation sans compte | Le visiteur remplit sa préparation (choix, texte, réglages) sans être connecté. Rien n'est envoyé au backend. |
| Clic sur **Générer** | Sans session, l'application propose l'inscription ou la connexion à cet instant précisément, pas avant. Avec session, le parcours continue. |
| Conservation des saisies | Les saisies sont gardées sur l'appareil pendant l'inscription, la confirmation par e-mail et la connexion, puis restaurées au retour. Rien n'est écrit dans le compte avant que le membre le décide. |
| Après confirmation | Retour à la préparation avec ses saisies, puis reprise de **Générer**. Le lien de confirmation peut s'ouvrir sur un autre appareil : voir « À trancher ». |
| Avatar | Facultatif, jamais bloquant ni demandé avant de générer. Une initiale tient lieu d'avatar. |
| Statuts artiste et label | Toujours facultatifs et cumulables, toujours sans privilège. |

Contraintes déjà décidées, à respecter :

- Aucune attribution automatique des données locales au compte (favoris, listes, crédits) : un choix
  explicite du membre, jamais un effet de bord de l'inscription.
- Une génération simulée n'est jamais présentée comme un service de production ; aucun paiement ni
  crédit réel dans ce parcours tant que son lot n'est pas autorisé.
- Les six langues et le RTL, l'identité noir, blanc et or, les composants existants.
- Un visiteur qui n'ouvre aucun écran de compte ne télécharge toujours pas le client Supabase (voir
  `BILAN.md`, section 6).
À trancher avant de commencer (non décidé ; ce sont des propositions, pas des décisions) :

- Les saisies conservées pourraient rester strictement locales, effacées à la déconnexion explicite et
  à la suppression du compte, avec une durée de vie bornée.
- Où garder les saisies : stockage du navigateur seul, ou aussi une copie dans le compte une fois
  connecté ?
- Que devient la préparation si le lien de confirmation est ouvert sur un autre appareil (les saisies
  locales n'y sont pas) : reprise à zéro annoncée clairement, ou autre mécanisme ?
- Quels éléments de la préparation sont sensibles et ne doivent pas rester en clair dans le navigateur.
- Limites par personne ou par jour avant et après inscription, et leur affichage.

Critères d'acceptation du futur lot (à compléter) : parcours complet visiteur vers membre sans perte de
saisie ; refus de confirmation, lien expiré et fermeture de l'onglet sans perte non signalée ; aucun
envoi au backend avant le clic sur **Générer** ; tests simulés et réels distingués dans le bilan.
