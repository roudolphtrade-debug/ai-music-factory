# Audit de conformité aux 5 maquettes officielles (lecture seule)

Références : les 5 maquettes du 10/11 sont accessibles (Accueil Cinematic Discovery, AI Radio Vinyl Signature, Studio MVP, Artist Universe, Artist Command Center). Limite : les captures automatiques sont bloquées en mode Plan ; comparaison fondée sur les recettes Lot 1.1 / Lot 2 / sélecteur et sur la lecture du code. Une capture avant/après sera faite au démarrage de chaque lot.

## Conformité par écran

| Écran | Conformité estimée | Écarts majeurs | Gravité |
|---|---|---|---|
| Accueil | ~70 % | Hero : CTA « Créer maintenant / Découvrir » + 4 raccourcis (Créer, Radio, Artistes, Concours) absents sous les CTA ; rangée de 5 grandes cartes d'entrée (Studio, Radio, Artistes, Collections, Concours & Awards) ; carrousel « Sélections du moment » avec flèches ; bloc « Top de la communauté » compact (3 lignes) ; barre mobile à 5 onglets (Accueil, Découvrir, Créer, Artistes, Radio) | Moyenne |
| AI Radio | ~40 % | Platine vinyle absente (pochette carrée) ; spectre décoratif limité ; file d'attente non visible à côté de la scène ; stations en mosaïques au lieu d'une couverture unique ; puces « Explorer par » ; badge « En lecture » à lier à la lecture réelle | Haute |
| Studio | ~30 % | Maquette = parcours 5 étapes (Idée & Style, Paroles, Voix, Génération, Clip & Export) avec onglets ; actuel = esquisse vocale (paroles + voix). Génération musicale, clip, mixage, mastering non opérationnels | Haute (fonctionnelle) |
| Artist Universe | ~55 % | Hero immersif plein cadre avec stats et distinction « Artiste du mois » ; onglets (Présentation, Titres, Albums, Clips, Playlists, Actualités, Événements, Communauté) ; blocs Nouvel album / Titres populaires / Clips | Moyenne |
| Command Center | ~35 % | Page Statistiques existante (démo) mais pas d'espace privé : menu latéral dédié, 4 KPI, courbe, répartition audience, contenus récents, projets | Moyenne |

## Visuel vs réellement opérationnel

- Opérationnel : lecteur global (lecture, file, aléatoire, répétition), favoris/playlists/historique locaux, filtres et stations Radio, six langues + RTL, crédits locaux de démo, pages artistes avec catalogue.
- Prototype : paroles IA + voix (routes IA en pause), Labels, Battles, Statistiques (données démo).
- À venir / purement visuel dans les maquettes : génération musicale complète, clip, mix/mastering, export, abonnés/écoutes réels, revenus, campagnes, événements, albums.
- Toute valeur chiffrée des maquettes (128K, 3,8M, 2 940 €) restera marquée Démo.

## À préserver absolument
Logo architectural, Bento validé, cinq piliers, sélecteur de langues, moteur audio et continuité, données locales, routes existantes, mentions Démo, contraintes de pause IA.

## Plan priorisé (un lot validé à la fois)

1. Accueil (premier) : raccourcis sous le hero, rangée de cartes d'entrée, carrousel « Sélections du moment », Top communauté compact, barre mobile 5 onglets. Sans toucher au Bento ni au lecteur.
2. AI Radio : Lot 2.2-A déjà cadré (platine, spectre statique, file rétractable, stations en couverture unique), puis 2.2-B (spectre réel), 2.2-C (recette).
3. Artist Universe : hero immersif, onglets, blocs album/titres/clips, sections vides honnêtes.
4. Studio : coquille 5 étapes ; étapes non disponibles affichées « Bientôt », sans présenter l'esquisse vocale comme génération complète.
5. Command Center : nouvel espace privé, données Démo, nécessite compte connecté (à arbitrer).

## Recette par lot
Six langues, RTL, 320/390/768/1280/1527 px, clavier, aucun débordement, lecture continue, favoris après rechargement, build et tests.

## Arbitrages demandés
- Barre mobile : passer à 5 onglets comme la maquette ?
- Command Center : route nouvelle privée ou évolution de Statistiques ?
- Studio : accepter les étapes « Bientôt » visibles ?

Aucune modification, aucun déploiement avant votre validation.
