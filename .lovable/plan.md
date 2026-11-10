# Plan d'exécution — Fidélité aux cinq maquettes officielles

Branche isolée actuelle : `edit/edt-d6b4081c…` (commit 038ce79). Aucune publication, aucune intervention sur main, Lovable Cloud/Supabase ou Cloudflare. Chaque lot s'arrête sur une validation explicite avant le suivant.

## Audit de l'existant (à ne pas reconstruire)

| Écran | Page actuelle | Déjà validé / réutilisable | Écart principal |
|---|---|---|---|
| Accueil | `/` | Hero artiste au casque (étape 2), carrousel, Top, cinq destinations (étape 3 en attente) | Barre mobile, en-tête sur 2 lignes, vide sous carrousel, mini-lecteur 320 px, flèche RTL |
| Radio « Vinyl Signature » | `/radio` | Stations filtrables, file, shuffle/repeat, lecteur partagé | Pas de platine, spectre décoratif, file non rétractable (cadrage 2.2 déjà validé) |
| Artist Universe | `/artists/$artistId` | Profil, titres, lecture, favoris | Bannière immersive, discographie, univers visuel |
| Artist Command Center | aucune page dédiée (`/analytics` = Statistiques) | Statistiques, Bibliothèque, Crédits | Écran entier à composer : KPI, courbe, répartition, contenus récents, projets |
| Studio de création | `/studio` | Composer, brouillons, exemples, génération (routes IA en pause) | Hero studio, 4 onglets, stepper 5 étapes, cartes Idée/Style/Voix, brouillon avec waveform |

Règle commune : fonctions non opérationnelles = bouton désactivé « Bientôt disponible » ; chiffres et artistes fictifs = badge « Démo » ; aucune capacité inventée (Clip, Mastering, Revenus, Campagnes restent « Bientôt disponible »).

## Lot 1 — Accueil « Cinematic Discovery » (finalisation)
- Clore l'étape 3 (vide sous carrousel), puis étape 4 : en-tête mobile sur une ligne, barre mobile cinq destinations, mini-lecteur à 320 px, flèche CTA en arabe.
- Fidélité : hero, carrousel, Top et cinq cartes conformes aux proportions de la maquette.

## Lot 2 — AI Radio « Vinyl Signature »
- Exécuter les sous-lots déjà cadrés : 2.2-A platine détaillée et composition, 2.2-B spectre réactif si l'audio le permet (sinon décoratif, mentionné), file desktop rétractable, 2.2-C recette.
- Stations restent marquées « Démo ».

## Lot 3 — Artist Universe
- Bannière plein cadre avec portrait, nom, statut neutre (humain / hybride / virtuel seulement si utile), actions Écouter / Suivre / Partager.
- Titres populaires, discographie en cartes, univers visuel, labels liés. « Suivre » marqué « Bientôt disponible » si non raccordé.

## Lot 4 — Artist Command Center
- Nouvelle page privée (accès connecté), sans toucher `/analytics` : barre latérale (Tableau de bord, Mes contenus, Statistiques, Communauté, Campagnes, Monétisation, Opportunités, Paramètres), 4 KPI, courbe d'écoutes, répartition d'audience en anneau, contenus récents, projets.
- Données réelles uniquement si traçables (favoris, historique, brouillons) ; tout le reste badgé « Démo ». Campagnes, Monétisation, Opportunités, Revenus : « Bientôt disponible ».
- Mobile : onglets Vue d'ensemble / Contenus / Stats et KPI empilés avec mini-courbes.
- Point à valider avant ce lot : adresse de la page et entrée dans le menu « Vous ».

## Lot 5 — Studio de création
- Hero studio (visuel micro + artiste, à générer et valider seul d'abord, représentation diverse), onglets Création / Paroles & Voix / Clip & Visuels / Mon projet, stepper 5 étapes.
- Cartes Votre idée, Style & Ambiance, Voix IA, bouton « Générer mon titre » branché sur le flux existant (toujours en pause côté serveur, message honnête).
- Brouillon avec waveform ; Éditer/Mixer/Effets/Mastering/Clip = « Bientôt disponible ». Carte crédits reprenant le solde réel.
- Mobile : onglets icônes, stepper compact, cartes empilées.

## Critères de fidélité (chaque lot)
- Composition et ordre des blocs identiques à la maquette ; proportions comparées par superposition de captures à 1440 et 390 px.
- Palette noir/blanc/or uniquement via les variables de thème ; Cormorant pour les titres, police fonctionnelle pour les contrôles ; logo A original intact.
- Halo doré, cartes arrondies à bord lumineux discret, motion respectant « réduire les animations ».

## Recette par lot
- Captures desktop 1440/1024 et mobile 390/320, en FR, AR (RTL), et une langue asiatique ; contrôle d'absence de débordement.
- Non-régression : lecture/pause/suivant, favoris, connexion/déconnexion, solde de crédits, persistance de langue, tests existants (vitest) relancés.
- Compte rendu : réalisé / préservé / testé / non testé (appareil réel, Safari, lecteur d'écran) ; arrêt et attente de validation.

## Détails techniques
- Composants dans `src/components/premium/`, traductions dans les catalogues six langues séparés existants, aucune migration, aucun appel IA, aucune nouvelle dépendance serveur.
