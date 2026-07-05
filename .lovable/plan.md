# Audit UX AI Music Factory — Mobile-first + Desktop

Objectif : corriger les incohérences mobile↔desktop du Top Charts, des Battles et de la page artiste, plus les défauts responsive (wordmark, vidéo). **Rien n'est implémenté avant ta validation de ce backlog.**

## Constats clés (confirmés par capture mobile 360/390px)

1. Top Charts mobile : bouton lecture doré permanent qui **chevauche et coupe le titre** du morceau.
2. Top Charts mobile : **favori (cœur) masqué** (`hidden sm:inline-flex`) → non dispo alors qu'il l'est sur desktop.
3. Écoute depuis le Top Charts : pas de **prev/suivant** au niveau de la ligne (seulement dans le mini-player global).
4. Battles : **aucun lien vers la page artiste** ; Top Charts : seul le nom est cliquable (pas titre/pochette).
5. Page artiste : pas de **création de playlists** à partir des favoris.
6. Bouton lecture : logique « au survol » (desktop) → sur mobile doit devenir « au tap/sélection », pas permanent.
7. Responsive : risque de troncature « Fact » du wordmark <340px et dans le mini-player ; vidéo intro en `object-cover` (crop non maîtrisé).

## Backlog priorisé

Légende — Impact: Haut/Moyen/Bas · Complexité: S/M/L · Priorité: P0 (bloquant) → P2.

| # | Item | Impact | Complexité | Priorité |
|---|------|--------|-----------|----------|
| B1 | Top Charts mobile : ajouter le **favori (cœur)** sur chaque ligne | Haut | S | P0 |
| B2 | Top Charts mobile : **réorganiser la ligne** pour que le bouton lecture ne coupe plus le titre | Haut | S | P0 |
| B3 | Bouton lecture mobile : afficher **uniquement à la sélection/tap** (ligne active), sinon rang/pochette — parité desktop | Haut | M | P0 |
| B4 | Fix responsive **wordmark « Factory »** (sidebar + mini-player) sur petits écrans (<340px) | Haut | S | P0 |
| B5 | Prev/Suivant accessibles pendant l'écoute depuis le Top Charts (mini-player mobile clair + contrôles cohérents) | Moyen | M | P1 |
| B6 | **Battles → page artiste** : rendre nom/pochette des contendants cliquables vers `/artists/$id` | Moyen | S | P1 |
| B7 | Top Charts → page artiste : rendre **titre + pochette** cliquables (pas seulement le nom) | Moyen | S | P1 |
| B8 | Page artiste : **catalogue complet** (tous les morceaux, pas une sélection) + favori sur chaque | Moyen | M | P1 |
| B9 | **Création de playlists** perso à partir des favoris (page artiste + bibliothèque) | Haut | L | P1 |
| B10 | Vidéo intro : **format maîtrisé** (letterbox/contain configurable) pour éviter le crop selon ratio | Bas | S | P2 |

## Améliorations UX complémentaires détectées (à arbitrer)

- Zone de tap trop petite sur mobile pour les contrôles (cible <44px sur cœur/lecture).
- Absence d'état « en lecture » visuel clair sur la ligne du Top Charts mobile (waveform comme dans `Playlist`).
- Recherche cachée sur mobile (`hidden sm:block`) : pas d'accès à la recherche sur petit écran.
- Bouton « Créer » (studio) masqué sur mobile dans la topbar — friction pour l'action principale.
- Cohérence des composants : le Top Charts n'utilise pas le composant `Playlist` (déjà gérant hover/état actif), d'où la divergence de comportement. Envisager de le factoriser.

## Détails techniques (implémentation proposée, après validation)

- **B1/B2/B3** — `src/routes/_app.index.tsx` (bloc Top Charts) : restructurer la ligne en grid `min-w-0` ; `LikeButton` visible mobile+desktop ; `PlayButton` en overlay sur la pochette, révélé par `group-hover` (desktop) et par état actif/tap (mobile) via `usePlayer().isActive`.
- **B4** — `src/components/layout/Logo.tsx` + mini-player : `whitespace-nowrap`, tailles fluides, éviter le wrap/troncature ; vérifier à 320px.
- **B5** — clarifier le mini-player mobile (`NowPlayingPlayer`/mini-player) ; garantir prev/next visibles quand une file est active.
- **B6/B7** — `BattleAudioCard.tsx` (wrap `Contender` nom/pochette dans `<Link to="/artists/$artistId">`) ; Top Charts idem sur titre+pochette.
- **B8** — `_app.artists.$artistId.tsx` : afficher tout le catalogue via `releasesFor(artist.id)` sans slice, `LikeButton` par ligne (déjà présent dans `trailing`).
- **B9** — nouveau `PlaylistsProvider` (persistance locale comme `LibraryProvider`) + UI d'ajout depuis favoris ; page/section « Mes playlists » dans la bibliothèque.
- **B10** — `IntroOverlay.tsx` : option `object-contain` + fond, ou ratio adaptatif.

## Découpage de livraison proposé

- **Lot 1 (P0, quick wins)** : B1, B2, B3, B4.
- **Lot 2 (P1, parité & navigation)** : B5, B6, B7, B8.
- **Lot 3 (P1/P2, nouvelle feature)** : B9, puis B10.

Dis-moi quels items tu valides (tout / un lot / une sélection) et je démarre l'implémentation en conséquence.
