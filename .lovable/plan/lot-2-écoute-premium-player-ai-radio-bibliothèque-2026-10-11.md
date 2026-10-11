# Lot 2 · Écoute premium : Player, AI Radio, Bibliothèque

Périmètre limité au lecteur global, à la page Radio et à la Bibliothèque. L'accueil (Lot 1.1), le Studio, les paiements, la publication, le logo et l'intro ne changent pas. Pas de backend ni de nouvelle dépendance.

## Audit ciblé (constaté dans le code)

| Élément | État actuel | Classe |
|---|---|---|
| Moteur audio (un seul élément audio, lecture continue entre les pages) | Fonctionne | Réutilisation |
| Lecture/pause, suivant/précédent, progression, volume, sourdine | Présents | Réutilisation |
| Erreurs de chargement | Ignorées sans rien afficher, aucun état « chargement » | Correction |
| Shuffle / Repeat (mini-player, Radio) | Boutons visibles mais sans effet | Correction |
| Cœur du mini-player | État local, non relié aux favoris | Correction |
| File d'attente | Existe en mémoire, aucune interface | Nouvelle fonctionnalité |
| Radio : chips genre/ambiance | Changent d'état visuel mais ne filtrent rien | Correction |
| Radio : stations | Boutons sans action ; badges « Live » et auditeurs inventés | Correction |
| Radio : « En direct », votes | Indicateurs fictifs | Correction (retrait ou libellé Démo) |
| Bibliothèque : favoris, historique, playlists | Stockage local fonctionnel (créer, renommer, supprimer, ajouter, retirer) | Réutilisation |
| Bibliothèque : lecture d'une playlist complète, édition, états vides, mobile | Partiels | Amélioration |

## 1. Player global
- Moteur conservé, extensions seulement : `shuffle` (ordre aléatoire réel, le titre courant reste en tête), `repeat` (désactivé, tout, un titre), état `status` (chargement, lecture, pause, erreur), `playAt(index)`, `moveInQueue`, `removeFromQueue`.
- En cas d'erreur : message court traduit, bouton Réessayer, passage automatique possible au titre suivant.
- Mini-player : Shuffle/Repeat actifs avec un état visible (`aria-pressed`), cœur relié aux vrais favoris, titre/artiste plus lisibles, indicateur de chargement.
- Nouveau panneau « File d'attente » (panneau latéral sur ordinateur, plein écran en bas sur mobile) : titre en cours, prochains titres, clic pour lire, monter/descendre avec boutons accessibles au clavier, retirer.
- Accessibilité : libellés traduits, zone d'annonce pour lecteur d'écran (titre et état), raccourci Espace pour lecture/pause hors champs de saisie, cibles de 44 px sur mobile.
- Le mode compact de l'accueil reste identique visuellement ; il reçoit seulement les fonctions qui marchent.

## 2. AI Radio
- Recomposition éditoriale : grand lecteur immersif (pochette, portrait), puis Bento : stations à gauche, liste à droite.
- Genres et ambiances : filtres combinables appliqués sur les titres réels (champs genre/ambiance existants). Compteur de résultats, bouton Réinitialiser, état vide honnête.
- Stations thématiques : chaque station = sélection locale définie par genre ou ambiance ; un clic lance sa file et la met en évidence. Libellé « Programmation démo » au lieu de « Live », nombre d'auditeurs retiré.
- Liste « À l'écoute » : alimentée par la sélection active, lecture et favori toujours visibles.
- Badge « En direct » et votes chiffrés retirés ou marqués Démo. Studio Masters et invite vocale conservés.

## 3. Bibliothèque
- Données locales conservées telles quelles (mêmes clés de stockage, aucune réinitialisation).
- En-tête avec compteurs réels (favoris, playlists, écoutes) et bouton « Tout lire ».
- Playlists : pochette en mosaïque, Lire / Aléatoire, création depuis la page, renommer, retirer un titre, réordonner, supprimer avec confirmation.
- États vides illustrés avec un lien vers la Radio ; mise en page mobile en liste compacte.

## 4. Six langues
Nouveaux textes ajoutés en FR, EN, ES, ZH, PT, AR, ponctuation STRATA, RTL arabe vérifié (icônes suivant/précédent inversées).

## Risques
- Le changement de lecteur touche tous les écrans : extensions ajoutées sans modifier les signatures existantes.
- Lecture aléatoire et file : la file actuelle de l'accueil doit rester identique quand le mode aléatoire est désactivé.
- Réordonner les playlists ajoute une fonction au stockage existant sans changer son format.

## Recette prévue (seuls les tests exécutés seront déclarés)
Navigateur automatisé : lecture/pause, suivant/précédent, progression, volume et sourdine, aléatoire et répétition (fin de titre simulée), file (sélection, ordre, retrait), filtres genre/ambiance (nombre de résultats), stations, favoris/playlists/historique après rechargement, lecture continue en changeant de page, 320/390/768/1280/1527 px, six langues et RTL, absence de débordement, erreurs JavaScript. Erreur de chargement simulée par une source invalide. Petits tests automatisés ajoutés pour l'ordre aléatoire, la répétition et le déplacement dans la file. Accueil revérifié pour non-régression.

## Détails techniques
Fichiers : `src/audio/PlayerProvider.tsx` (+ `src/audio/queue.ts` logique pure testée), `src/components/premium/AudioPlayer.tsx`, nouveau `src/components/audio/QueuePanel.tsx`, `PlayButton.tsx` (état chargement), `NowPlayingPlayer.tsx`, `src/routes/_app.radio.tsx`, nouveau `src/audio/stations.ts`, `src/routes/_app.library.tsx`, `src/library/PlaylistsProvider.tsx` (ajout `moveInPlaylist`), `src/i18n/translations.ts`. Tests vitest dans `src/audio/queue.test.ts`.
