# AI Music Factory — Direction artistique chromatique
## Référentiel fonctionnel pour les cinq maquettes

**Statut : décision produit et direction artistique validée**  
**Dates : 12 novembre 2026 (couleur) ; 15 novembre 2026 (logo B3, titres, animations et référencement)**  
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
| **Accueil** | Hero chaleureux, spectre et halo dorés expressifs ; cartes de destinations, sélections et pochettes plus distinctes, lumineuses et colorées selon le contenu. | Conserver les CTA validés, le logo officiel B3 et la lecture. Ne pas recolorer toute la navigation. |
| **AI Radio** | Platine et contrôles noirs/or ; **six stations** reconnaissables par une image et une atmosphère colorée propres ; lumière maîtrisée autour du vinyle. | Les couleurs différencient visuellement, sans remplacer le nom, les genres ou les contrôles. Le spectre reste décoratif dans le lot UI. |
| **Artist Universe** | Identité éditoriale propre à l'artiste : portraits, scène, bannières, albums, clips et contenus peuvent être nettement plus vibrants. | Ne pas imposer une palette générique à tous les artistes. Respecter la lisibilité du nom, des actions et du profil. |
| **Artist Command Center** | Interface de travail sobre ; accents chromatiques dans graphiques, courbes, répartition de l'audience et indicateurs réels. | Pas de tableau de bord arc-en-ciel ; métriques « Démo » tant que les données ne sont pas réelles. Ne pas coder les états par couleur seule. |
| **Studio de création** | Bandeau cinématographique, visuels d'ambiance, voix, styles, projets et clips plus expressifs ; surfaces d'édition conservant leur lisibilité. | Le travail créatif prime : ni saturation permanente ni animation gênante autour des champs et contrôles. Les capacités futures restent indiquées honnêtement. |

### 3. Principes invariants

- **Logo :** **B3, logo à ondes, remplace officiellement le logo architectural A** (décision confirmée le 15/11/2026). Les anciennes références de maquettes qui montrent d'autres logos ne font pas autorité. Préserver la géométrie du B3, sa lisibilité, ses variantes autorisées et son usage sur supports noirs ou clairs. Vérifier le pack source avant toute adaptation.
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

### 6. Compléments validés au 15 novembre 2026 — marque, titres et mouvement

**Identité :** le nouveau logo **B3 à ondes** est adopté comme signature officielle sur le site, les versions mobiles, le favicon, les cartes sociales, le lecteur et les films de marque. L'animation ne doit pas redessiner arbitrairement sa géométrie. La mise en production des assets, de leurs variantes et de leurs tailles reste une tâche technique distincte, avec contrôle du pack réel.

**Titres :** l'impression de blanc excessif vient de son omniprésence, pas nécessairement du blanc brut. Conserver des textes principaux à forte lisibilité, mais rechercher un **blanc cassé chaud**, des nuances secondaires plus tempérées et un **accent or champagne ciblé** (un mot ou un segment), sans appliquer systématiquement de l'or à tous les titres. Respecter les contrastes sur chaque image, les scripts FR/EN/ES/PT/ZH/AR, l'orthographe et l'équilibre visuel. Ne pas recolorer en bloc les formulaires et les contrôles.

**Mouvement :** la direction d'animation est transversale aux cinq maquettes : Accueil (onde vivante, halo et reflet discret autour du casque), AI Radio (vinyle, bras, diamant, lumière et spectre), Artist Universe (transitions de contenus et portraits), Command Center (graphiques sobres), Studio (formes d'onde et étapes réelles de production). Les animations doivent être légères, annulables quand nécessaire, et respecter la réduction du mouvement. **Aucun effet sonore ne se déclenche au chargement.** Le son du diamant, discret et facultatif, doit être initié par un geste utilisateur et ne pas retarder ni masquer la vraie lecture. Ne pas imiter un véritable contact physique avec des comportements trompeurs lorsque la piste démarre sans ce rituel.

**Film d'entrée :** distinguer une **signature facultative 2–3 secondes** et un **film de marque d'environ 15 secondes** lancé volontairement, avec une progression émotion musicale → création → clip → découverte → communauté → B3. Le contenu relève d'un storyboard/prototype à valider, pas d'un film déjà produit.

**Fonctionnalités :** ne pas réduire les maquettes au seul code existant. Conserver les fonctions futures utiles dans les interfaces avec un état vrai « Démo » ou « Bientôt disponible » ; ne jamais activer un faux paiement, un faux générateur ni une fausse capacité de production. Toute réalisation opérationnelle reste soumise à validation de lot.

**Référencement :** la qualité SEO/GEO des pages publiques et des œuvres est une exigence transversale ; voir [référentiel fonctionnel SEO/GEO](../seo/REFERENTIEL_SEO_GEO_FONCTIONNEL.md) et [plan technique](../seo/PLAN_SEO_GEO_TECHNIQUE.md). Pas d'indexation de contenus fictifs ou de zones privées par défaut.
