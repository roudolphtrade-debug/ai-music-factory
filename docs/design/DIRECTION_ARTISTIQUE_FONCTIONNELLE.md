# AI Music Factory — Direction artistique chromatique
## Référentiel fonctionnel pour les cinq maquettes

**Statut : décision produit et direction artistique validée**  
**Date : 12 novembre 2026**  
**Périmètre :** Accueil « Cinematic Discovery », AI Radio « Vinyl Signature », Artist Universe, Artist Command Center, Studio de création.  
**Autorité :** décision explicite du directeur de projet AIMF.  
**Nature :** spécification visuelle ; **aucun changement de fonctionnalité ni déploiement n'est autorisé par ce document**.

### 1. Décision fondatrice

> **L'interface AIMF conserve son ossature premium noir / anthracite / blanc / or. Les univers musicaux, artistiques et éditoriaux retrouvent la couleur, la lumière, la profondeur et le contraste cinématographiques des cinq maquettes validées.**

La couleur n'est pas un abandon de l'identité AIMF ; elle permet de différencier les œuvres, artistes, styles et atmosphères. Le constat à corriger est la monotonie visuelle de certaines cartes sombres du prototype par rapport aux maquettes.

Trois niveaux :
1. **Structure / navigation / système :** noir profond, anthracite, blanc, or ; surfaces lisibles, cadres sobres, états et CTA cohérents.
2. **Contenus et expression artistique :** palettes éditoriales variées selon l'image et l'identité de l'artiste ; exemples non obligatoires : ambre, cuivre, orange, magenta, violet, bordeaux, bleu nuit, cyan doux et lavande.
3. **Lumière / profondeur :** halos, reflets, contrastes et dégradés ciblés pour une immersion musicale. Bannir l'arc-en-ciel systématique, les néons omniprésents, les fonds agressivement saturés et l'accumulation d'effets.

Les associations couleur/genre servent d'inspiration, **jamais de règles fixes** ni de stéréotypes culturels. La couleur ne doit pas uniformiser les artistes d'un genre ou d'une origine.

### 2. Comportements attendus par écran

| Interface | Application fonctionnelle de la couleur | Garde-fous |
| --- | --- | --- |
| **Accueil** | Hero chaleureux, spectre et halo dorés expressifs ; cartes de destinations, sélections et pochettes plus distinctes, lumineuses et colorées selon le contenu. | Conserver les CTA validés, le logo A et la lecture. Ne pas recolorer toute la navigation. |
| **AI Radio** | Platine et contrôles noirs/or ; **six stations** reconnaissables par une image et une atmosphère colorée propres ; lumière maîtrisée autour du vinyle. | Les couleurs différencient visuellement, sans remplacer le nom, les genres ou les contrôles. Le spectre reste décoratif dans le lot UI. |
| **Artist Universe** | Identité éditoriale propre à l'artiste : portraits, scène, bannières, albums, clips et contenus peuvent être nettement plus vibrants. | Ne pas imposer une palette générique à tous les artistes. Respecter la lisibilité du nom, des actions et du profil. |
| **Artist Command Center** | Interface de travail sobre ; accents chromatiques dans graphiques, courbes, répartition de l'audience et indicateurs réels. | Pas de tableau de bord arc-en-ciel ; métriques « Démo » tant que les données ne sont pas réelles. Ne pas coder les états par couleur seule. |
| **Studio de création** | Bandeau cinématographique, visuels d'ambiance, voix, styles, projets et clips plus expressifs ; surfaces d'édition conservant leur lisibilité. | Le travail créatif prime : ni saturation permanente ni animation gênante autour des champs et contrôles. Les capacités futures restent indiquées honnêtement. |

### 3. Principes invariants

- **Logo :** logo architectural **A original** conservé ; ne pas le remplacer par le pictogramme « barres » des maquettes.
- **Typographie :** préserver la hiérarchie éditoriale et la lisibilité des contrôles dans les six langues ; ne pas réintroduire des problèmes d'accents ou de découpe des titres.
- **Accessibilité :** texte, CTA et navigation lisibles par-dessus les images ; focus visible ; perception indépendante de la seule couleur ; prise en charge du mouvement réduit.
- **Internationalisation :** français, anglais, espagnol, chinois, portugais, arabe RTL ; les éléments décoratifs ne doivent pas déplacer ou masquer les textes.
- **Honnêteté :** une esthétique premium ne doit pas déguiser une fonctionnalité future en fonction opérationnelle ; conserver « Démo » et « Bientôt disponible » selon la réalité.
- **Équilibre :** chaque nouveau visuel ou palette contribue à l'atmosphère sans compromettre les performances et la navigation.

### 4. Critères d'acceptation visuelle

1. Comparer **la même section, au même niveau de défilement et à échelle comparable** avec la maquette officielle ; capturer desktop **1440 / 1024 px** et mobile **390 / 320 px**, au minimum en FR et AR, compléter ZH selon le lot.
2. Le nouvel écran doit présenter **davantage de variation chromatique sur les contenus** et un éclairage cinématographique maîtrisé, mais garder une interface système noir/blanc/or cohérente.
3. Aucune baisse de contraste ou lisibilité, aucun texte tronqué, aucune superposition avec le visage d'un artiste, aucun débordement horizontal ; vérifier lecteur, favoris et navigation.
4. Vérifier les différences de perception sur mobile et dans les interfaces RTL ; préserver l'expérience sur les appareils moins puissants.
5. **Valider un binôme maquette/rendu par lot** ; la validation d'une couleur sur un écran n'autorise pas une refonte globale.

### 5. Gouvernance et portée

La décision concerne **la cible graphique officielle** et doit guider la finition de l'Accueil ainsi que les lots Radio, Artist Universe, Command Center et Studio. Elle n'autorise pas une modification de `main`, une publication ni la souscription à un fournisseur d'images/vidéos. La mise en œuvre suit les lots UI-first déjà validés, avec arrêt et arbitrage humain après chaque lot.

**Document compagnon technique :** [DESIGN_SYSTEM_TECHNIQUE.md](./DESIGN_SYSTEM_TECHNIQUE.md).
