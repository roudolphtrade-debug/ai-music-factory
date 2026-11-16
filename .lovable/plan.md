# Recette isolée — AI Radio Vinyl Signature (lecture seule)

## Environnement
- Sandbox Lovable, serveur de développement local (`localhost:8080`), Chromium headless Playwright, 16/11/2026 vers 17:50 UTC.
- SHA observé : `8aa28848cb70a67a00b9a4d17fbb289e19442ea4` (correspond). Nom de branche locale : `edit/edt-ed1e627f-…` (nom interne Lovable, pas `feat/radio-2b-photoreal`). Arbre de travail propre.
- Limite : le SHA servi par l'aperçu hébergé `id-preview--…` n'a PAS été vérifié (pas d'accès authentifié). La recette porte sur le serveur local à ce SHA.
- Aucun fichier du projet modifié, aucun commit. Scripts et captures uniquement dans `/tmp/browser/recette/`.

## Résultats

| Point | Statut | Preuve observée |
|---|---|---|
| Vraies pistes du catalogue | PASS | `voice-1.mp3`, `voice-2.mp3`, `voice-3.mp3` chargées depuis le CDN d'assets du projet, HTTP 206 |
| Lecture (clic réel « Lire Amber Cathedral ») | PASS | `paused=false`, temps 3,8 s après 4 s, durée 212,8 s ; 1440/390/320 |
| Pause en milieu de piste | PASS | `paused=true` à ~6 s, bouton redevient lecture, libellé « En pause » |
| Reprise | PASS | temps reprend (~9 s), même piste |
| Rotation 1,8 s/tour | PASS | `animation-duration: 1.8s` ; angles relevés toutes les 450 ms : 27°→117°→-153°→-43° (≈ 90°/450 ms = 360°/1,8 s) ; `paused` au repos et en pause |
| Bras posé en lecture | PASS | `data-arm-position=playing` |
| Bras levé en pause milieu de piste | PASS | `data-arm-position=lifted` |
| Bras au repos initial | PASS | `rest` avant toute lecture |
| Bras au repos après fin de piste | NON TESTÉ | la fin de piste enchaîne automatiquement le titre suivant (voice-3 « Server Prayer » lu), donc pas d'état « fin de file » observé |
| Bras au repos après erreur audio | NON TESTÉ | aucune erreur provoquée (interdit de substituer un fichier) |
| Piste suivante | PASS | « Porcelain Halo » / `voice-2.mp3`, lecture continue, bras `playing` |
| Photo de l'artiste | PASS (visuel) | portrait affiché à droite (desktop), pochette au centre du disque ; capture `d1440_2_play.png` |
| Spectre décoratif | PASS | barres dorées présentes, libellé « Spectre décoratif · sans analyse audio », `aria-hidden` |
| Réduction des animations | PASS | `prefers-reduced-motion: reduce` → `animation: none` sur le disque |
| Desktop 1440 | PASS | aucun débordement horizontal (scrollWidth − innerWidth = 0) |
| Mobile 390 / 320 | PASS | même parcours réussi, débordement 0 ; capture `m320_3_pause.png` |
| Erreurs JS | PASS | 0 `pageerror`, 0 erreur console sur les 4 sessions |
| 404 audio | PASS | 0 réponse ≥ 400 ; toutes les requêtes média en 206 |
| Logo B3 officiel, sans ancien A | FAIL | barre latérale desktop et en-tête mobile affichent toujours le monogramme A ; aucun asset B3 trouvé dans `src/assets` |
| Châssis, reflets, halo or | PASS sous réserve | platine photoréaliste (`radio-deck`, `radio-sheen`, bras `radio-arm` en WebP, 9–237 Ko) visible avec reflets et halo ; mais le châssis porte des autocollants décoratifs dont un pictogramme proche de l'ancien A — à valider par la direction artistique |

## Limites
- Chromium uniquement ; Safari, Firefox et appareils réels NON TESTÉS.
- Audition humaine non réalisée : la lecture est prouvée par la progression du temps et les requêtes réseau, pas par écoute.
- Mode « réduction des animations » contrôlé à l'état repos seulement (pas pendant la lecture).
- Lecture déclenchée avec politique d'autoplay assouplie par le navigateur de test ; le clic reste un vrai clic utilisateur.

## Points bloquants à arbitrer (aucune correction lancée)
1. B3 : intégrer les fichiers officiels — le lot n'est pas conforme tant que l'A reste affiché.
2. Autocollant « A » sur le châssis : retirer ou confirmer.
3. Cas fin de file et erreur : prévoir une recette dédiée (ex. répétition désactivée sur dernier titre).
