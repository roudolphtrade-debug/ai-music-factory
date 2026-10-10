# Lot 1.1 — Positionnement inclusif et accueil premium

Aucune modification avant validation.

## 1. Composition détaillée de l'accueil

```text
1. SCÈNE D'OUVERTURE (plein cadre, ~85% de la hauteur d'écran)
   - Visuel artistique généré : scène de concert noire, faisceaux dorés,
     silhouettes d'artistes (humains et hybrides), structures argentées
   - Titre monumental : « La musique entre dans une nouvelle ère. »
   - Sous-titre : « Créez, découvrez et partagez la musique à l'ère de
     l'intelligence artificielle. »
   - Boutons : Explorer la musique (doré) · Commencer à créer (contour argent)
   - En bas à droite : « À la une », carte compacte jouable (pochette,
     titre, artiste, waveform animée pendant la lecture)
   - Animations : léger zoom lent du visuel, apparition du titre mot à mot,
     grain cinéma ; désactivées si l'utilisateur limite les animations
2. DÉCOUVERTE — Sélection éditoriale
   - Grande pochette n°1 mise en avant + liste 2–10 à côté (badge Démo)
   - Rangée « Ambiances » : grandes cartes de genres avec visuels
3. ARTISTES ET NOUVEAUX TALENTS
   - Défilement horizontal de portraits hauts (format magazine),
     nom en serif, genre en petites capitales
4. CRÉATION — bloc éditorial pleine largeur
   - « Votre prochain titre commence ici » + accès au Studio (fonction réelle)
5. RADIO · DÉFIS CRÉATIFS · COMMUNAUTÉ — trois blocs de tailles inégales
6. CARRIÈRE — bandeau sobre vers Tableau de bord et Labels
7. Bandeau des 5 piliers déplacé en pied d'accueil (rôle de repère)
```
- Continuer l'écoute / Favoris : rangée compacte sous le hero, seulement s'il y a un historique.
- « Prenez vos marques » : réduit à une petite bannière repliable, masquable définitivement, affichée seulement aux nouveaux visiteurs.
- Les statistiques de la plateforme (fictives) sont retirées de l'accueil.
- Le Jury quotidien passe dans le bloc Défis.

## 2. Discours de marque
- Logo : « Social OS for AI artists » remplacé par « Music · Create · Discover ».
- Titres, descriptions de pages et partages sur les réseaux : positionnement inclusif (artistes humains, hybrides et IA, producteurs, fans, pros).
- Pages Artistes et Avatar Lab : « artistes de tous horizons » au lieu de « nés de l'IA ».
- Badge « En direct » retiré de la radio et de l'accueil (rien n'est diffusé en direct) → « En écoute ».
- Traduction des 6 langues : FR et EN rédigés avec soin ; ES, PT, ZH et AR traduits de la même façon.

## 3. Navigation recommandée
```text
DISCOVER  Accueil · Artistes · Radio
CREATE    Studio · Avatar Lab (outil de création visuelle)
CONNECT   Communauté · Défis créatifs (avec Temple de la renommée en onglet)
GROW      Tableau de bord · Labels
VOUS      Bibliothèque · Profil et réglages · Offres Premium
```
- IDENTITY reste un pilier conceptuel (profil artiste), mais n'a pas de rubrique tant que les comptes n'existent pas.
- Bibliothèque passe dans « Vous », car il s'agit d'un usage personnel.
- Premium redevient visible mais discret dans « Vous », marqué Démo (pas de vrai paiement).
- Temple de la renommée : intégré comme onglet dans Défis créatifs ; l'ancienne adresse reste accessible.
- La carte « Platinum » de la barre latérale est retirée : elle faisait doublon avec Premium.

## 4. Composants
- Réutilisés : PlayButton, LikeButton, Waveform, Reveal, DemoBadge, lecteur global, ArtistCard (restylée).
- Nouveaux : CinematicHero, FeaturedTrackCard, EditorialChart, TalentRail, CreateBanner, MosaicTriptych.
- Remplacés sur l'accueil : grille de statistiques, onglets Charts/Genres, bloc radio « Live ».
- Lecteur global : pochette plus grande, waveform à la place de la barre, état de lecture doré.

## 5. Nouvelles fonctionnalités possibles (sans serveur)
- « À la une » choisi chaque jour parmi le catalogue réel.
- Ambiances : file de lecture par humeur à partir des titres existants.

## 6. Impacts et risques
- Accueil réécrit en grande partie : des sections existantes disparaissent de l'accueil, mais pas de l'app.
- 1 image générée pour le hero (poids optimisé, format webp).
- Traductions dans 6 langues : quantité de textes importante.
- Aucune donnée utilisateur touchée.

## 7. Périmètre exact de la prochaine implémentation
Points 1 à 3 complets, ainsi que le restylage du lecteur global et des cartes artistes. Exclus : comptes, données réelles, paiement.
