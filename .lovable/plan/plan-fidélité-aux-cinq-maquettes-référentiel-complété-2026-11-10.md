# Plan — Fidélité aux cinq maquettes (référentiel complété)

Les cinq maquettes officielles sont reçues. Orientation UI-first validée. Premier critère de réussite : fidélité aux compositions desktop et mobile. Branche isolée, aucune publication, aucune intervention sur Cloud ou Cloudflare.

## Lot 1 — Accueil (en cours)
Partir des composants déjà validés (hero, carrousel, Top, cinq cartes) : corriger uniquement les écarts visuels, sans reconstruire les sections conformes.
Écarts à corriger :
- Hero : sur-titre doré « La musique entre dans » avec petit spectre, « ère. » en or, spectre partant du visage ; quatre raccourcis en ligne (icône + texte) sur ordinateur, cercles dorés sur mobile.
- Cinq cartes : Studio mis en avant (plus large, bord doré) ; Concours & Awards dans la colonne de droite au-dessus du Top.
- Sélections du moment : petites cartes carrées (6 visibles sur ordinateur), flèches latérales, « Voir tout ».
- Top communauté compact et bandeau « Rejoindre la communauté » sur une ligne.
- Mobile : en-tête sur une ligne (logo A, recherche, cloche, menu) ; barre du bas conservée telle que validée — Accueil / Découvrir / Créer / Radio / Bibliothèque, sans doublon, entrée active en or.
- Lecteur bas desktop : pochette, cœur, temps, mini-spectre, contrôles, volume, file, plein écran.
Livrable : captures comparatives maquette / rendu côte à côte, desktop et mobile ; arrêt pour validation avant la Radio.

## Lot 2 — AI Radio « Vinyl Signature »
- En-tête « AI RADIO » et titre de la maquette.
- Platine à gauche (logo A sur le disque, bras doré) ; au centre badge « En lecture », titre, artiste, styles, cœur, contrôles, barre de progression.
- Spectre strictement décoratif : aucune analyse audio dans cette phase.
- File d'attente à droite, rétractable ; sur mobile, bouton « File d'attente · N titres ».
- Six cartes de stations et rangée « Explorer par » ; filtres sans données en « Bientôt disponible ».

## Lot 3 — Artist Universe
- Grande bannière : « ARTISTE », nom, badge vérifié seulement si la donnée existe, styles, accroche, Écouter / Suivre / Partager, chiffres et « Artiste du mois » badgés « Démo ».
- Onglets Présentation, Titres, Albums, Clips, Playlists, Actualités, Événements, Communauté ; vides en « Bientôt disponible ».
- Présentation : Nouvel album, Titres populaires (lecture et cœur réels), Clips officiels.
- Mobile : bannière, chiffres en trois colonnes, Écouter / Suivre, onglets défilants.

## Lot 4 — Artist Command Center
- Barre latérale profil, « Nouveau titre », quatre chiffres clés, courbe, anneau d'audience, contenus récents, projets.
- Données « Démo » sauf données réelles de l'utilisateur ; Monétisation, Campagnes, Opportunités, Revenus en « Bientôt disponible ».
- Mobile : onglets Vue d'ensemble / Contenus / Stats.
- À valider avant : adresse de la page et entrée de menu.

## Lot 5 — Studio de création
- Bandeau micro + artiste (visuel validé seul d'abord), onglets, parcours en 5 étapes, cartes Idée / Style / Voix, « Générer mon titre » sur le flux existant.
- Toutes les fonctions opérationnelles actuelles sont conservées ; « Bientôt disponible » réservé aux capacités réellement absentes, après inventaire du code.
- Carte crédits avec solde réel.

## Règles communes
- Logo officiel **B3 à ondes** : remplace le A architectural par décision expresse du 15/11/2026. Le pack B3 fait autorité ; ses fichiers doivent être audités avant intégration. Les marques différentes visibles sur les anciennes maquettes ne sont pas la source d'identité.
- Sélecteur de langue au globe conservé (pas de drapeaux).
- Noms et chiffres des maquettes = données « Démo ».
- Diversité sans stéréotypes, six langues, arabe RTL, accessibilité clavier.

## Recette par lot
Captures 1440 / 1024 / 390 / 320 px en FR, AR, ZH, à côté de la maquette ; débordements ; lecture/pause/suivant, favoris, connexion, crédits ; tests relancés ; arrêt pour validation.

## Addendum transversal — Décisions confirmées le 15/11/2026

**Identité B3 :** utiliser le nouveau logo à ondes comme marque officielle sur les cinq maquettes, favicon, partages et animation d'entrée, après contrôle des assets. Ne pas lancer de remplacement en production sans lot de recette distinct.

**Typographie :** préserver l'ossature noir/blanc/or et le Hero validé ; éviter les titres uniformément blancs en introduisant un blanc cassé chaud, un or champagne limité aux accents et une hiérarchie de gris chauds lisibles. Ne pas mettre tous les titres en or et vérifier le contraste sur photographie.

**Animations :** signature d'entrée facultative 2–3 s, film de marque volontaire ~15 s ; sur l'Accueil, onde/halo/reflet casque ; sur AI Radio, vinyle tournant + bras/diamant à l'action de lecture, crépitement discret uniquement avec geste utilisateur, pause et réduction de mouvement respectées. Les trois autres lots héritent de la même doctrine de mouvement. Les effets proposés sont des spécifications à prototyper, pas des fonctions déjà présentes.

**Fonctionnalités futures :** ne pas supprimer les capacités des maquettes au prétexte qu'elles sont non implémentées. Préserver les affordances avec mention « Démo » ou « Bientôt disponible » honnête, sans clic trompeur ni promesse de capacité inexistante.

**SEO/GEO transversal :** pages publiques, métadonnées, SEO international FR/EN/ES/PT/ZH/AR, HTML SSR indexable, canonicals, hreflang, sitemap, données structurées sincères, B3 en partage, descriptifs œuvres/artistes et performances. Contrôler confidentialité et non-indexation des données démo/privées avant mise en ligne. Référentiels : [SEO/GEO fonctionnel](../../docs/seo/REFERENTIEL_SEO_GEO_FONCTIONNEL.md) et [SEO/GEO technique](../../docs/seo/PLAN_SEO_GEO_TECHNIQUE.md).

Référentiels DA : [fonctionnel](../../docs/design/DIRECTION_ARTISTIQUE_FONCTIONNELLE.md) et [technique](../../docs/design/DESIGN_SYSTEM_TECHNIQUE.md). L'addendum est documentaire, sans code ni déploiement.
