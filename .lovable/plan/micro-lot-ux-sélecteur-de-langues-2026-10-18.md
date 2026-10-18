# Micro-lot UX · Sélecteur de langues

## 1. Stratégie Git : préalable bloquant

- Le Lot 2.1 est fusionné dans `main` et validé, selon votre confirmation.
- Branche locale observée : `edit/edt-00650ebd-89d2-424d-b87f-aa8781407bd9`. Il s’agit de la branche de travail interne ; elle ne prouve pas quelle branche est synchronisée avec Lovable. Aucune modification locale en attente au moment du contrôle.
- Je ne peux ni consulter le statut de synchronisation Git de Lovable, ni changer sa branche synchronisée depuis le chat. **La branche réellement synchronisée reste donc à confirmer dans Paramètres du projet → Git.**
- Branche dédiée proposée : **`ux/language-selector-premium`**, créée depuis le `main` intégrant le Lot 2.1, puis choisie comme branche synchronisée dans Lovable via le sélecteur de branches.
- Avant de coder : vous validez cette stratégie, puis confirmez dans les paramètres Git que la branche dédiée est sélectionnée et que le Lot 2.1 y est présent et synchronisé.
- **L’implémentation ne sera pas effectuée directement sur `main`.** Aucun changement du sélecteur tant que la branche dédiée et sa synchronisation ne sont pas confirmées. Les modifications resteront sur cette branche jusqu’à votre validation ; fusion vers `main` uniquement sur décision explicite de votre part.
- Aucun commit manuel, changement de branche par commande Git ou publication. Les futures modifications seront enregistrées par le mécanisme habituel de Lovable sur la branche sélectionnée.

## 2. Résultat UX/UI

Un seul sélecteur à toutes les tailles d’écran : globe, langue active et chevron, sans drapeau dans le bouton.

- Surface sombre et bordure neutre très discrète, texte clair, accent champagne limité à la sélection et à l’ouverture. Utilisation des couleurs et composants existants, sans modification des styles globaux.
- Bouton compact, non dominant, avec cible tactile de 44 px sans agrandir l’en-tête.
- Nom natif sur desktop ; code compact lorsque l’espace est contraint : FR, EN, ES, ZH, PT-BR, AR. Le nom complet reste annoncé aux lecteurs d’écran.
- Menu : **Français, English, Español, 中文, Português (Brasil), العربية**, dans cet ordre. Choix actif identifié par une coche et un accent discret, pas uniquement par la couleur.
- Menu positionné pour rester dans l’écran, y compris en arabe ; noms multilingues isolés pour éviter les inversions de lecture.
- Survol discret, focus visible, état ouvert clairement identifiable ; transitions non essentielles supprimées lorsque la réduction des animations est demandée.

## 3. Périmètre exact

### Fichiers d’implémentation autorisés
- `Topbar.tsx` : remplacer les deux présentations actuelles par le sélecteur unique ; ajuster uniquement l’espace nécessaire à son insertion.
- Nouveau `LanguageSelector.tsx` : isoler l’affichage et les six noms natifs ; réutiliser `Button`, `DropdownMenu` et le groupe de sélection unique existants.
- Tests ciblés suivant les conventions du projet.

### Préservation stricte
Dictionnaires, codes de langue, fournisseur de traductions, stockage et restauration de langue inchangés. RTL arabe conservé. Aucune suppression du composant de drapeaux, aucune modification des composants partagés ou des styles globaux.

Recherche, notifications, bouton Créer, navigation, audio et continuité de lecture, favoris, playlists, données du Lot 2.1, accueil, Radio et Studio restent inchangés. Lot 2.2 non commencé.

## 4. Risques et réponses

- **Largeur des libellés** : nom complet sur desktop, code compact aux tailles contraintes, menu assez large mais borné par l’écran.
- **En-tête chargé** : contrôler recherche, notifications et Créer dans chaque langue ; conserver leurs comportements et visibilité actuels.
- **RTL et noms latins** : transmettre la direction au menu et isoler chaque libellé natif.
- **Accessibilité** : conserver sélection unique, flèches, Entrée, Espace, Échap, fermeture extérieure et restitution du focus au bouton. Annoncer langue active, ouverture et sélection.
- **Persistance** : utiliser exclusivement le mécanisme existant, sans nouvelle lecture du stockage au rendu initial.
- **Git** : aucune implémentation avant confirmation de la branche dédiée synchronisée.

## 5. Recette et critères d’acceptation

- Six langues à **320, 390, 768, 1093, 1280 et 1527 px** : un seul bouton, noms complets dans le menu, aucun débordement ni conflit avec les autres commandes.
- Sélectionner chaque langue ; naviguer puis recharger : langue conservée, RTL actif uniquement pour l’arabe.
- Clavier : Tab, Entrée, Espace, flèches et Échap ; focus visible, sélection unique et retour du focus vérifiés.
- Vérifier les noms accessibles et états exposés ; contrôle visuel des contrastes et du mode réduction des animations. Les annonces d’un lecteur d’écran réel seront distinguées des vérifications automatisées.
- Lancer un morceau, ouvrir le menu, changer de langue et naviguer : lecture maintenue. Vérifier recherche, notifications, accès Créer et un favori déjà enregistré sans changer leurs données.
- Exécuter les tests concernés ; contrôler la compilation automatique et les erreurs de la console.
- Fournir des captures ciblées desktop/mobile et un compte rendu factuel : réalisé, préservé, testé et limites de vérification.

## 6. Autorisation attendue

**Valider ce plan et la branche proposée, puis confirmer la branche réellement synchronisée dans les paramètres Git. Aucun code ne sera modifié avant cette confirmation. Aucune publication.**
