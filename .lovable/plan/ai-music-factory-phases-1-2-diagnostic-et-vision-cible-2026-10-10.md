# AI Music Factory — Phases 1 & 2 : Diagnostic et vision cible

Aucune modification de code n'est faite à ce stade. Ce document est à valider avant la Phase 3 (direction artistique) et le Lot 1.

## Phase 1 — Diagnostic

### Ce qui fonctionne vraiment aujourd'hui
- Lecture audio réelle (Top Charts 1–10, Radio, Studio Masters), mini-lecteur global, file prev/suivant.
- Studio : génération réelle (paroles + voix IA via le service IA intégré), brouillons sauvegardés dans le navigateur.
- Favoris, historique, playlists perso : réels mais stockés uniquement sur l'appareil (perdus en changeant de navigateur).
- 6 langues (FR/EN/ES/ZH/PT/AR avec RTL), intro vidéo, recherche ⌘K.

### Ce qui est simulé (problème vis-à-vis de la directive « ne jamais présenter du fictif comme réel »)
- Artistes, auditeurs, classements, statistiques, Hall of Fame, Analytics : données inventées.
- Labels : revenus « simulés » affichés comme des montants.
- Crédits / abonnements / paiement : simulateur, aucun paiement réel.
- Battles, votes, jury, notifications : locaux, aucun autre utilisateur réel.
- Communauté : contenus factices.
- Pas de comptes utilisateurs : aucune identité, aucun partage réel entre utilisateurs.

### Classification

| Élément | Décision | Raison |
|---|---|---|
| Lecteur audio global + Waveform | Conserver / améliorer | Socle solide, à rendre plein écran immersif sur mobile |
| Intro vidéo + logo A | Conserver | ADN validé |
| Studio (génération) | Améliorer | Seule vraie création ; ajouter import de sons, versions, crédits créatifs |
| Avatar Lab | Fusionner dans Identity | Doublon partiel avec profil artiste |
| Profils artistes | Améliorer | Devenir le cœur « Identity » (bio, catalogue, crédits, collaborations) |
| Radio | Améliorer | Radios thématiques / « mood » basées sur le catalogue réel |
| Top Charts | Améliorer | Classement à étiqueter « Sélection éditoriale » tant qu'il n'y a pas d'écoutes réelles |
| Battles + Bracket + Jury + Saisons | Fusionner → « Défis créatifs » | 4 écrans pour un seul concept, aujourd'hui sans vrais participants |
| Hall of Fame | Fusionner dans Défis | Sous-section des gagnants |
| Labels + simulateur de revenus | Remplacer | Par un « Espace Pro » (roster, sorties, demandes), sans revenus inventés |
| Crédits / Premium / Paiement | Supprimer de la navigation pour l'instant | Simulation de paiement trompeuse ; à réactiver avec un vrai paiement |
| Analytics | Remplacer | Par un tableau de bord artiste basé sur des données réelles (écoutes de l'utilisateur) |
| Communauté (factice) | Remplacer | Par « Connect » réel après ajout des comptes |
| Bibliothèque (favoris, historique, playlists) | Conserver / améliorer | Synchronisée sur le compte |
| Notifications | Conserver | Basées sur de vrais événements |
| Statistiques inventées partout | Supprimer ou étiqueter « démo » | Contrainte de la directive |

### Problèmes UX transverses
- 14 entrées de navigation : trop pour un nouvel utilisateur, hiérarchie floue.
- Action principale (Créer) masquée sur mobile.
- Accueil : empilement de sections sans parcours clair (découvrir vs créer).
- Pas de lecteur plein écran mobile (standard des apps musicales).

## Phase 2 — Vision cible

### Nouvelle navigation (5 piliers)

```text
CREATE    Studio (générer, importer, brouillons, versions)
IDENTITY  Mon profil artiste (avatar, bio, catalogue, crédits créatifs)
DISCOVER  Accueil éditorial, Charts, Radios, Playlists, Artistes
CONNECT   Communauté, Collaborations, Défis créatifs
GROW      Tableau de bord, Promotion, Espace Pro / Labels
```
Mobile : barre du bas = Discover · Search · Create (bouton central doré) · Library · Profil.

### Parcours prioritaires
1. Fan : découvrir → écouter (lecteur plein écran) → aimer → playlist → suivre l'artiste.
2. Créateur : créer/importer un titre → l'éditer → le publier sur son profil → le partager.
3. Créateur : publier → recevoir des écoutes réelles → voir son tableau de bord.
4. Pro/label : découvrir des artistes → les ajouter à son roster → les contacter.

### Fonctionnalités différenciantes
- Crédits créatifs et traçabilité : chaque titre affiche ce qui est humain, IA ou hybride (voix, paroles, prod).
- Radios « mood » générées depuis le catalogue réel.
- Défis créatifs : un thème, des soumissions, un vote de la communauté.
- Collaboration : demander un featuring / remix à un autre créateur.
- Lecteur immersif : pochette animée, waveform, paroles synchronisées.

### Priorisation et faisabilité

| Lot | Contenu | Faisable maintenant ? |
|---|---|---|
| 1 | Accueil éditorial premium + composants visuels transverses + nouvelle navigation 5 piliers + étiquetage honnête des données démo | Oui, sans backend |
| 2 | Lecteur plein écran mobile, Radios mood, Studio : import de son + crédits créatifs | Oui, sans backend |
| 3 | Comptes utilisateurs, profils publics, publication de titres, bibliothèque synchronisée | Nécessite Lovable Cloud (gratuit à activer, usage facturé au-delà du quota) |
| 4 | Défis créatifs réels, votes, collaborations, notifications réelles | Nécessite Lovable Cloud |
| 5 | Tableau de bord avec vraies écoutes, Espace Pro | Nécessite Lovable Cloud |
| 6 | Abonnements / crédits payants, distribution vers plateformes, droits musicaux | Paiement réel (Stripe), services externes, questions juridiques — à décider plus tard |

Coût récurrent existant : la génération du Studio consomme des crédits IA à chaque création.

## Décisions attendues
1. Valides-tu la classification (notamment retrait des paiements simulés et fusion Battles/Hall of Fame) ?
2. Valides-tu la navigation 5 piliers ?
3. Après validation : Phase 3 (direction artistique + maquette de l'accueil), puis Lot 1.

## Notes techniques
- Note : la directive mentionne GitHub ; la connexion GitHub se fait depuis les réglages du projet Lovable (Connectors → GitHub), je ne peux pas la faire depuis le chat.
- Les données utilisateur locales existantes (favoris, playlists, brouillons) seront migrées vers le compte au Lot 3, pas supprimées.
