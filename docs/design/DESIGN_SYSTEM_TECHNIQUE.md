# AI Music Factory — Couleur immersive
## Référentiel technique du design system

**Statut : spécification technique issue de la décision DA du 12 novembre 2026 — à implémenter par lots, après validation des rendus.**  
**Nature de ce changement : documentation seule. Aucun CSS, composant, token ou média du site n'a été modifié pour appliquer cette spécification.**

**Source fonctionnelle :** [DIRECTION_ARTISTIQUE_FONCTIONNELLE.md](./DIRECTION_ARTISTIQUE_FONCTIONNELLE.md).

### 1. Architecture visuelle à préserver

- **Couche système :** surfaces, navigation, formulaires, lecteurs, CTA et structure restent noirs / anthracite / blancs / or ; utiliser l'échelle et les variables existantes.
- **Couche éditoriale :** pochettes, portraits, bannières et stations accueillent une diversité de teintes et une intensité lumineuse adaptées au contenu.
- **Couche d'ambiance :** gradients, halos, spots et reflets ciblés et facultatifs. La visibilité des informations essentielles doit rester indépendante de l'ambiance.
- **Couche informative :** datavisualisations et états peuvent employer des accents secondaires, mais doivent avoir libellés, légendes et états non coloriels.

**Implémentation existante inspectée sur la branche `main` au 12/11/2026 :** `src/styles.css` (Tailwind v4, variables de thème `--background`, `--foreground`, `--card`, `--gold`, `--gold-soft`, `--gold-deep`, `--chart-1` à `--chart-5`, et variantes `:root` / `.dark`). Typographies `Cormorant Garamond` (éditorial) et `Manrope` (interface) ; pile fonctionnelle `Calibri/Carlito/Segoe UI` déjà définie pour certaines surfaces. **Ne pas remplacer ces choix sans décision distincte.**

### 2. Politique des couleurs et design tokens

**Ne pas fixer aujourd'hui de codes hexadécimaux officiels** : les couleurs secondaires doivent être dérivées des maquettes et contrôlées sur de vrais contenus avant verrouillage.

Ordre de mise en œuvre recommandé :
1. Réutiliser les tokens système existants et vérifier leur contraste en contexte sombre et clair si ce thème est exposé.
2. Définir des **tokens sémantiques de contenu** distincts des couleurs de navigation : accent visuel de carte, atmosphère d'artiste, halo de section, couleurs de séries statistiques. Les noms définitifs seront validés lors de l'implémentation ; ne pas considérer les exemples comme des variables déjà présentes.
3. Permettre qu'un artiste, album, station ou clip possède son identité visuelle propre **sans table rigide « genre → couleur »**.
4. Encadrer la saturation / l'intensité de lumière par type d'usage et par contraste, plutôt que par un pourcentage arbitraire identique partout.
5. Isoler les changements au niveau du composant ou d'une variante réutilisable. Ne pas recolorer globalement tous les boutons, badges et bordures.

**Interdictions :** surcharge de `#hex` éparpillés en JSX, remplacement des tokens primaires par les couleurs d'illustrations, filtres uniformes qui rendent les portraits artificiels, dépendance au seul code couleur pour un état métier, transformation du logo A validé.

### 3. Règles par composant

| Composant | Couche système | Couche expressive possible |
| --- | --- | --- |
| Header, sidebar, tabbar | Noir, blanc, or ; focus et états cohérents | Aucune couleur de genre |
| Hero | Texte et CTA contrastés | Portrait, halo, onde et arrière-plan lumineux ; voile de lisibilité si nécessaire |
| Cartes musique / artiste / album | Titres, lecture, cœur et états stables | Pochette authentique ou générée, éclairage et gradient local |
| Stations AI Radio | Contrôles et typographie stables | Visuels de station contrastés, atmosphères colorées distinctes |
| Artist Universe | Navigation des onglets lisible | Palette artistique configurable par profil / projet |
| Command Center | Fond neutre ; badges explicites | Courbes et graphiques accessibles, palettes différenciables |
| Studio | Champs, labels et boutons éditables sobres | Bandeau, styles, voix, illustrations et cartes de création |

### 4. Contrastes, accessibilité et internationalisation

- Viser a minima les critères WCAG AA pertinents : **4,5:1** pour le texte courant, **3:1** pour les grands textes et les éléments d'interface concernés. Vérifier en situation réelle, **sur les images et dégradés** et non sur un fond théorique.
- Ne pas poser des titres directement sur une zone claire d'un visage ; privilégier placement, voile local, recadrage ou contraste texte/fond.
- Conserver focus clavier visible et ordre logique ; contraste suffisant des icônes de lecture et favoris sur pochettes colorées.
- Préserver français, anglais, espagnol, chinois, portugais et arabe RTL ; ne pas inverser automatiquement des visages/portraits en RTL si cela dénature une image. Inverser seulement les compositions et directions logiques nécessaires.
- Pour la micro-animation et le halo : suivre `prefers-reduced-motion` ; garder les états statiques expressifs si les effets sont désactivés.

### 5. Médias et performances

- Préférer des ressources adaptées à chaque zone (`srcset`, `sizes` et formats compressés WebP/AVIF lorsque pertinents) ; éviter d'alourdir la page uniquement pour augmenter la luminosité.
- Prioriser le chargement du **LCP** du Hero ; utiliser le chargement différé des médias hors écran. Mettre en place des images de remplacement adaptées et éviter les déplacements de mise en page.
- Ne pas ajouter de vidéos animées automatiques, WebGL, shaders ou filtres coûteux sans étude de performances, d'accessibilité et validation.
- Optimiser les gradients et halos : préserver le rendu sur mobile et l'autonomie des appareils.

### 6. Protocole d'implémentation et de recette

**Workflow UI-first :** un lot / écran à la fois, sur branche isolée, audit du composant existant, comparaison réelle à la maquette, correction ciblée, puis validation. Ne pas lancer de développement fonctionnel ou d'appel IA payant au titre de la direction artistique.

La recette associe :
- Captures **1440, 1024, 390 et 320 px**, FR et AR, et contrôle ZH selon le lot, sur **zones identiques aux maquettes et au même niveau de scroll**.
- Revue de chromie (diversité des pochettes/stations), lumière, recadrage, contraste, hiérarchie et charge visuelle.
- Contrôles interactifs : lecture/pause/suivant, favoris, menus, navigation, onglets, clavier et RTL ; six langues sans régression.
- Contrôles de défilement horizontal, chevauchement des barres, performances et états `loading / empty / error`.
- Tests automatiques + build et **signalement des tests intermittents**, même si une relance réussit.
- Safari, Firefox, appareils réels et lecteurs d'écran déclarés « non testés » tant qu'aucune preuve n'existe.

### 7. Frontières et versionnement

Cette spécification **n'est pas une implémentation** et ne change aucun composant, API, schéma, base de données, coût fournisseur, accès, droit ni modèle de monétisation. Les valeurs exactes des éventuels nouveaux tokens, le traitement des images et le niveau de glow sont des **choix de réalisation à arbitrer par captures**.

Documenter chaque changement futur par écran et le soumettre à validation. La nouvelle richesse chromatique ne constitue pas un feu vert pour publier, modifier `main` ou déployer AIMF.
