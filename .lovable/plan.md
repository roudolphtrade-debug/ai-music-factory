# Lot UI Accueil — « Cinematic Discovery » (préparation)

## Référence actuelle (captures prises le 10/11, 1280 et 390 px)
- Ordinateur : hero scénique « La musique entre dans une nouvelle ère. », CTA « Explorer la musique » et « Commencer à créer », « À la une » Midas Touch (Démo), puis Sélection éditoriale Bento. Aucun débordement.
- Mobile : aucun débordement, mais l'en-tête passe sur deux lignes (« Se connecter » et « Créer un compte » sous la recherche, environ 105 px). La barre du bas a cinq places : Accueil, Rechercher, Créer (central), Bibliothèque, Menu.
- Les captures seront copiées dans Fichiers (`Lot-Accueil-Reference/`) dès l'autorisation, car le mode Plan bloque l'écriture.

## Branche de travail
- Branche active constatée : `edit/edt-5aa8e25c-…`, branche de travail isolée de Lovable, commit `ec04828`. Elle n'est pas `main`.
- Si vous voulez une branche nommée (ex. `ux/home-cinematic-discovery`), sélectionnez-la dans Paramètres → Git avant le démarrage.
- Aucune publication, aucune intervention sur Supabase, Cloudflare ni Lyria.

## Périmètre visuel du lot 1
1. Sous les CTA du hero : quatre raccourcis discrets (Créer, Radio, Artistes, Défis), en icône dorée et libellé court. Les liens mènent vers des pages existantes. Le hero scénique, le titre et les deux CTA restent inchangés.
2. Rangée « Entrées » de cinq cartes illustrées : Studio de création, AI Radio, Artistes, Collections (vers la Bibliothèque), Défis et Temple. Elle se place entre le hero et le Bento. C'est un défilement horizontal sur mobile.
3. Le Bento actuel est conservé. Seule la rangée de quatre titres devient le carrousel « Sélections du moment », avec des flèches sur ordinateur et un balayage au doigt sur mobile.
4. « Top de la communauté » : version compacte de trois lignes avec lecture et favori, à côté des cartes d'entrée sur ordinateur. Le classement des dix titres reste en place. Libellé honnête : « Sélection démo », sans nombre d'écoutes.
5. Diversité : les cartes et le carrousel reprennent les portraits existants pour équilibrer les profils (genres, origines, artistes humains, hybrides et virtuels). Aucun nouvel artiste ni aucun chiffre inventé. Une nouvelle illustration (Collections) est générée seulement si aucune image existante ne convient.
6. Barre mobile à cinq destinations, alignée sur la maquette : Accueil, Découvrir (Artistes), Créer (central), Radio, Bibliothèque. Le Menu complet reste accessible depuis le bouton de l'en-tête, et la recherche depuis l'en-tête. La hauteur et la zone de sécurité ne changent pas.
7. En-tête mobile : ramener « Se connecter » et « Créer un compte » sur une seule ligne, sous forme d'icône ou de bouton compact. Cet ajustement se limite à l'accueil et à la mise en page.

## Composants concernés
- `src/routes/_app.index.tsx` : insertion des nouvelles sections.
- `src/components/premium/CinematicHero.tsx` : raccourcis sous les CTA.
- `src/components/premium/HomeEditorial.tsx` : carrousel « Sélections du moment ».
- Nouveaux composants : `HomeEntryCards.tsx`, `CommunityTopCompact.tsx`.
- `src/components/layout/MobileTabBar.tsx` : remplacer Rechercher et Menu par Artistes et Radio.
- `src/components/layout/Topbar.tsx` : les boutons de connexion du mobile seulement.
- `src/i18n/home-editorial.ts` : nouveaux textes dans les six langues.

Ne changent pas : moteur audio, lecteur, favoris, playlists, données, routes, logo, sélecteur de langues, cinq piliers, pages Radio, Studio et Artistes.

## Risques
- La barre mobile apparaît sur toutes les pages. Il faut vérifier que la recherche et le menu restent accessibles partout.
- Une page plus longue pourrait ralentir le chargement. Les images seront chargées progressivement.
- Le RTL arabe et les libellés longs (PT, ES) peuvent poser problème dans les cartes et la barre.

## Recette
- Six langues, à 320, 390, 768, 1093, 1280 et 1527 px : aucun débordement, cibles d'au moins 44 px, RTL pour l'arabe uniquement.
- Clavier sur le carrousel et les cartes, avec focus visible. Réduction des animations respectée.
- Lecture, pause, suivant et favori depuis le Top compact et le carrousel. Favori retrouvé après rechargement. Lecture continue en changeant de page.
- Les cinq onglets mobiles mènent aux bonnes pages. Recherche et menu atteignables.
- Tests existants, nouveaux tests pour la barre mobile, compilation, captures avant/après et compte rendu.

## Hors lot (décisions notées)
- Artist Command Center privé distinct, plus tard, à partir des statistiques existantes.
- Studio : fonctions non opérationnelles marquées « Bientôt disponible », dans un lot ultérieur.
