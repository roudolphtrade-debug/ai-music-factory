## Problème

Sur smartphone, dans le « Top des charts », le bouton lecture doré est rendu toujours visible (`opacity-100`) **par-dessus** la pochette (44×44 px). Le rond doré de 36 px couvre presque toute l'image, donc on ne voit plus le visage de l'artiste.

## Objectif

Garder le bouton lecture clairement visible et accessible sur mobile **tout en laissant la pochette / le visage visible**.

## Solution retenue

Sur mobile, sortir le bouton lecture de la pochette : la pochette reste pleine et nette, et un bouton lecture compact dédié s'affiche dans la ligne (à droite, près du compteur d'écoutes). Sur desktop, on conserve le comportement actuel (overlay au survol de la pochette).

```text
Mobile (avant)            Mobile (après)
[##▶##] Titre   12.4M     [visage] Titre   (▶) 12.4M
 ↑ visage caché            ↑ visage visible + bouton à côté
```

### Détails techniques (`src/routes/_app.index.tsx`, section TOP CHARTS)

- Pochette : retirer l'overlay toujours-visible sur mobile. L'overlay + `PlayButton` au-dessus de l'image restent **uniquement** au survol sur desktop (`hidden sm:grid` + `sm:opacity-0 sm:group-hover:opacity-100`), pour que le visage soit toujours net sur mobile.
- Ajouter un `PlayButton` compact dédié dans la ligne, visible seulement sur mobile (`inline-flex sm:hidden`), placé juste avant le compteur d'écoutes, à côté du cœur.
- Réorganiser légèrement la fin de ligne sur mobile pour que cœur + lecture + écoutes tiennent proprement (le cœur `LikeButton` est aujourd'hui `hidden sm:inline-flex` ; on l'aligne avec le nouveau bouton si besoin de cohérence).
- Vérifier le rendu via capture Playwright en viewport mobile (375 px) et desktop pour confirmer que les visages sont visibles et le bouton accessible.

Aucune logique métier modifiée : changements purement de présentation/visibilité responsive.