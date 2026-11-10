# Lot UI Accueil — « Cinematic Discovery » (plan révisé)

Référence : maquette officielle « Accueil cinématographique », ordinateur et mobile. Captures de l'état actuel prises à 1280 et 390 px, sans aucun débordement constaté. Elles seront copiées dans Fichiers (`Lot-Accueil-Reference/`) dès l'autorisation, car le mode Plan bloque l'écriture.
Branche active : `edit/edt-5aa8e25c-…`, branche isolée de Lovable, différente de `main`. Si vous voulez une branche nommée, sélectionnez-la dans Paramètres → Git. Aucune publication, aucune intervention sur Supabase, Cloudflare ni Lyria.

## 1. Hero recomposé, fidèle à la maquette
- Nouvelle scène : une artiste au casque doré, de profil, à droite, entourée d'un halo doré. Un spectre musical doré horizontal part du texte et rejoint la scène. Fond noir profond.
- Le visuel est une nouvelle illustration originale, générée pour la marque. La maquette n'est jamais utilisée comme image. L'image du concert actuel est archivée, pas supprimée.
- Le spectre est décoratif : il est fixe avec la réduction des animations, pulse doucement sinon, et ne prétend jamais réagir au son. Il ne gêne ni la lecture du texte ni les clics.
- Promesse validée conservée : « La musique entre dans une nouvelle ère. », avec « une nouvelle ère » en or et en Cormorant.
- Deux CTA conservés, avec leurs destinations actuelles : « Explorer la musique » (principal, doré) et « Commencer à créer » (contour). Les libellés de la maquette, « Créer maintenant » et « Découvrir », ne sont pas repris, pour garder la promesse validée.
- Sous les CTA, une ligne de quatre raccourcis avec icône dorée : Créer, Radio, Artistes, Défis. Ils mènent vers des pages existantes.
- La ligne « À la une » (lecture et favori) sort du hero et devient le lecteur de la carte principale (section 2).
- Diversité : la représentation reste non stéréotypée, sans costume folklorique ni caricature. L'ensemble des portraits de la page doit équilibrer les genres, les origines et les profils (artistes humains, hybrides et virtuels).

## 2. Réorganisation sans duplication (aucune rangée ajoutée)
Architecture cible sur ordinateur, avec la même hauteur totale ou moins qu'aujourd'hui :
```text
[ HERO : texte + 2 CTA + 4 raccourcis | artiste au casque + spectre ]
[ Studio ][ AI Radio ][ Artistes ][ Collections ] | [ Concours & Awards ]
[ Sélections du moment (carrousel)            ]   | [ Top communauté x3 ]
                                                   | [ Rejoindre la communauté ]
[ Classements / Genres / Tendances / Jury (onglets existants) ]
[ Reprendre l'écoute · Favoris · Onboarding ] (existant, conditionnel)
[ Cinq piliers ]
```
- Les cinq destinations remplacent la grille actuelle de `EditorialSelection` : les mêmes images et le même gabarit Bento sont réaffectés, rien n'est empilé. Collections mène à la Bibliothèque. Concours & Awards mène aux Défis et au Temple.
- « Sélections du moment » reprend les quatre titres de la sélection éditoriale (avec lecture et favori), en carrousel accessible avec des flèches et le balayage au doigt.
- Le Top communauté compact reprend les trois premiers titres du classement existant, sans nombre d'écoutes, avec le badge Démo. Le classement complet de dix titres reste dans les onglets existants.
- « Rejoindre la communauté » reprend le contenu actuel de `CreateAndConnect` et de `DiscoveryCompanions`, qui disparaissent de leur place actuelle. Rien n'est en double.
- Les cinq piliers, la reprise d'écoute, les favoris, l'onboarding et les défis restent en place, à leur rang actuel.
- Sur mobile, l'ordre est : hero, raccourcis, carrousel « Sélections du moment », Top communauté, cinq destinations en grille de 2 colonnes, puis la suite inchangée.

## 3. Navigation mobile : analyse et proposition
Constaté :
- La barre du bas s'affiche sur toutes les pages, sauf la connexion et l'inscription (pages à part).
- Elle est plus compacte sur l'accueil.
- Elle contient : Accueil, Rechercher, Créer (central), Bibliothèque, Menu. Le menu complet est aussi accessible par le bouton de l'en-tête.

Cible :
- Accueil, Découvrir (Artistes), Créer (central), Radio, Bibliothèque. C'est l'ordre de la maquette, avec Bibliothèque à la place de Profil.
- La recherche reste dans l'en-tête sur toutes les pages, avec le même raccourci. Il faut vérifier que le champ ou son icône reste visible à 320 px.
- Le menu complet reste accessible par le bouton de l'en-tête sur chaque page.

États de connexion :
- Visiteur : la Bibliothèque reste accessible (données locales), comme aujourd'hui. Créer mène au Studio, qui gère déjà son propre accès.
- Membre connecté : la barre est identique. Le compte reste dans l'en-tête.
- Comptes non configurés : la barre ne change pas et rien ne mène à une impasse.
- En-tête mobile : aujourd'hui, « Se connecter » et « Créer un compte » passent sur une deuxième ligne. Ils deviennent un seul bouton de compte compact, sur une seule ligne, à toutes les tailles mobiles.

Pages à vérifier : Accueil, Artistes, page artiste, Radio, Studio, Avatar Lab, Communauté, Défis, Temple, Statistiques, Labels, Bibliothèque, Paramètres, Crédits, Bienvenue, ainsi que l'onglet actif sur chacune.

## Composants concernés
- `CinematicHero.tsx` : recomposition et raccourcis.
- Nouvel élément décoratif `HeroSpectrum.tsx`, réservé à l'accueil.
- Nouvelle image `src/assets/hero-headphones.jpg`.
- `HomeEditorial.tsx` : destinations, carrousel et Top compact, en réutilisant les blocs existants.
- `_app.index.tsx` : nouvel ordre des sections, suppression des doublons déplacés.
- `MobileTabBar.tsx` : les cinq destinations.
- `AccountMenu.tsx` / `Topbar.tsx` : présentation mobile compacte seulement.
- `home-editorial.ts` : nouveaux textes dans les six langues.

Ne changent pas : moteur audio, lecteur, favoris, playlists, données, routes, logo, sélecteur de langues, cinq piliers, pages Radio, Studio et Artistes.

## Risques
- Le nouveau visuel s'écarte de la direction validée au Lot 1.1. Je vous soumets d'abord l'image seule, pour validation avant intégration.
- Supprimer Rechercher et Menu de la barre peut faire perdre des repères. L'en-tête doit garantir les deux à 320 px, en RTL et dans chaque état de connexion.
- La réaffectation du Bento peut faire perdre les tests et ancres existants. Il faut contrôler les liens et les tests actuels de l'accueil.
- Les libellés longs (PT, ES) et l'arabe peuvent poser problème dans les raccourcis, le carrousel et la barre.
- Performance : le hero est chargé en priorité, le reste est chargé progressivement, et le spectre décoratif ne doit pas peser.

## Critères de recette
- Fidélité : composition comparée côte à côte avec la maquette, sur ordinateur et mobile. Hauteur totale de l'accueil inférieure ou égale à l'actuelle. Aucun bloc en double.
- Six langues, à 320, 390, 768, 1093, 1280 et 1527 px : aucun débordement, cibles d'au moins 44 px, RTL pour l'arabe uniquement.
- Clavier sur les raccourcis, le carrousel, le Top et la barre, avec focus visible. Réduction des animations respectée. Contrastes AA sur le hero.
- Lecture, pause et favori depuis le carrousel et le Top. Favori retrouvé après rechargement. Lecture continue en changeant de page.
- Barre mobile : onglet actif juste sur toutes les pages listées. Recherche et menu atteignables, en visiteur comme en membre.
- Contenus fictifs toujours identifiés comme Démo. Aucun chiffre d'audience ajouté.
- Tests existants, nouveaux tests de la barre mobile, compilation, captures avant/après et compte rendu factuel.

## Étapes
1. Génération du visuel hero, soumis seul pour validation.
2. Recomposition du hero.
3. Réorganisation des sections.
4. Barre mobile et en-tête.
5. Recette complète et compte rendu, puis arrêt.

## Hors lot (décisions notées)
- Artist Command Center privé distinct, à partir des statistiques existantes.
- Studio : fonctions non opérationnelles marquées « Bientôt disponible ».
