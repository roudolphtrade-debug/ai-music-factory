# Mettre les 10 chansons dans le Top des charts (ordre numéroté)

## Objectif
Le « Top des charts » de la page d'accueil affiche 10 lignes (rangs 1 → 10). Actuellement chaque ligne joue un son générique (rotation `voice-*`). On va attacher les 10 chansons que tu viens d'uploader, **dans l'ordre des numéros** : fichier `1` → rang 1, fichier `2` → rang 2, … fichier `10` → rang 10.

## Fichiers concernés
- `1 Bbby.mpeg` → chart-1
- `2 bobby.mpeg` → chart-2
- `3 Bobby.mpeg` → chart-3
- `4 booby.aac` → chart-4
- `5 bobby.mpeg` → chart-5
- `6 C'est ton jour.mp3` → chart-6
- `7 bobby.mpeg` → chart-7
- `8 bobby.mpeg` → chart-8
- `9 bobby.aac` → chart-9
- `10 Bobby.mpeg` → chart-10

## Étapes techniques

1. **Transcodage + upload CDN**
   - Réencoder chaque fichier (mpeg/aac/mp3) en MP3 propre (`ffmpeg`, `-c:a libmp3lame`, faststart).
   - Uploader via `lovable-assets` en `chart-1.mp3` … `chart-10.mp3`, stockés dans `src/audio/charts/` avec leurs pointeurs `.asset.json`.

2. **Déclaration des sources** (`src/audio/tracks.ts`)
   - Importer les 10 nouveaux pointeurs.
   - Ajouter un tableau `CHART_SOURCES = [chart1.url, …, chart10.url]` et un helper `chartSourceAt(rank)` qui renvoie la chanson correspondant au rang (1 → index 0).
   - Étendre `makePlayable` avec un paramètre optionnel `src` pour permettre de forcer la source audio.

3. **Branchement dans le Top des charts** (`src/routes/_app.index.tsx`)
   - Dans la construction de `chartQueue`, passer `src: chartSourceAt(c.rank)` pour que chaque ligne du classement joue la bonne chanson, dans l'ordre numéroté.

4. **Vérification**
   - Build, puis contrôle via Playwright que chaque bouton lecture des 10 lignes du Top des charts pointe bien vers `chart-1.mp3` … `chart-10.mp3` dans l'ordre.

## Notes
- Les titres/artistes affichés dans le classement restent inchangés ; seule l'audio jouée est remplacée par les 10 chansons numérotées.
- Aucune modification de logique backend ni de données autres que le mapping audio.
