# Lot 2.2 · Radio Signature Immersive — cadrage VALIDÉ (référence)

Statut : validé sur le principe par Roudolph le 2026-10-11. Autorisation d'exécution en attente.
Verrou préalable : le Lot 2.1-A est finalisé par Claude Code sur une branche Git distincte. Aucune modification du Lot 2.2 tant que le Lot 2.1-A n'est pas intégré et synchronisé. Ne pas toucher à l'état Git (branche gérée en interne).

## Précisions de validation (contractuelles)
1. La platine est une véritable pièce maîtresse visuelle : vinyle détaillé (sillons, label central), bras de lecture, profondeur, reflets métalliques et accents champagne maîtrisés. Pas une simple pochette circulaire.
2. Le spectre audio est spectaculaire, expressif et dominant dans la partie inférieure de la scène musicale. À terme, réaction réelle aux fréquences lorsque la source le permet, sans simulation trompeuse : en attendant l'analyse réelle (2.2-B), le spectre reste explicitement décoratif, jamais présenté comme réactif.
3. La file d'attente desktop reste secondaire et rétractable. Elle ne réduit pas excessivement la platine ni ne compromet l'immersion (repliable, hors de la scène principale au repos).

## Invariants préservés
Identité AI Music Factory, navigation et chrome global validés, lecteur audio global et continuité de lecture, stations/filtres/playlists/favoris, six langues + RTL arabe, mention « Programmation démo », aucun faux indicateur Live/auditeurs, accessibilité et préférence reduced-motion, performances, Studio/accueil/paiements/données enregistrées intacts.

## 2.2-A · Composition UX/UI et spectre statique
- Scène musicale principale : platine vinyle maîtresse (disque détaillé avec sillons et reflets, pochette intégrée au label central, bras de lecture posé/relevé selon l'état lecture/pause, rotation continue en lecture, arrêt en pause), habillage noir profond/argent/blanc, accents or champagne, spotlight et fumée discrets.
- Spectre monumental pleine largeur en partie basse de la scène : barres dorées, rendu statique expressif (variante de Waveform), animation douce d'ambiance uniquement en lecture, `prefers-reduced-motion` respecté.
- Métadonnées (titre, artiste · genre · ambiance) et commandes reprises du lecteur existant : play/pause, précédent/suivant, aléatoire, répétition, progression (Seekbar), volume, favori, partage.
- Desktop : file d'attente en panneau latéral rétractable (état fermé par défaut), ouverture sans dégrader la platine ; mobile : file via QueuePanel existant en feuille basse.
- Stations thématiques, filtres genre/ambiance et playlist conservés tels quels sous la scène.
- Composants réutilisés : NowPlayingPlayer (refondu), Waveform/WaveBars, Seekbar, VolumeControl, PlayButton, LikeButton, ShareButton, DemoBadge, QueuePanel, stations.ts, PlayerProvider (aucun changement du moteur audio).

## 2.2-B · Analyse audio réelle et animations synchronisées
- Faisabilité établie : Web Audio API (AnalyserNode) sur l'élément audio existant. Condition : la source doit êtresame-origin ou servir des en-têtes CORS (`crossOrigin="anonymous"` sur l'élément + CORS sur le CDN des assets). Si l'autorisation échoue, repli gracieux sur le spectre d'ambiance de 2.2-A, sans jamais afficher une fausse réactivité.
- Synchronisations : spectre par bandes de fréquences, rotation de la platine calée sur l'état de lecture, bras de lecture animé, pulsations discrètes.
- Aucune nouvelle dépendance lourde ; canvas/DOM pur.

## 2.2-C · Recette responsive, accessibilité et performances
- Six langues × 320/390/768/1280/1527 px sans débordement ; RTL arabe (icônes skip inversées).
- Clavier et lecteur d'écran : libellés traduits, focus visible, rôles slider conservés.
- Non-régression : continuité de lecture entre pages, favoris, file, aléatoire/répétition, stations et filtres, Bibliothèque, accueil Bento inchangé.
- Performances : animations GPU-composited, pas de reflow en boucle, charge visuelle mesurée.

## Risques
- CORS des assets audio peut empêcher l'AnalyserNode → repli décoratif assumé, annoncé honnêtement.
- Refonte du NowPlayingPlayer : toucher la page Radio uniquement, le lecteur global et les autres écrans restent intacts.
- Rotation/perf du vinyle sur mobile modeste → tailles et FPS limités, reduced-motion.

## Tests prévus (seuls les tests exécutés seront déclarés)
Playwright : lecture/pause, suivant/précédent, spectre présent et animé en lecture, file desktop rétractable, stations et filtres fonctionnels, favoris après rechargement, continuité de lecture, six langues et RTL, cinq largeurs, erreurs console. Vitest uniquement si de la logique pure est ajoutée.
