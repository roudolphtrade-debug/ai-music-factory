# AI Music Factory — Plan technique SEO/GEO
**Statut : audit préliminaire du code et spécification technique au 15 novembre 2026.**
**Nature :** documentation uniquement ; aucune correction ni publication effective.

## 1. État inspecté dans le projet Lovable
| Composant | État constaté | Risque / décision |
|---|---|---|
| `src/routes/__root.tsx` | Métadonnées globales `title`, description, Open Graph et Twitter ; image sociale d'ancienne identité | Les remanier pour B3 et éviter les métadonnées génériques sur chaque route |
| `src/routes/_app.index.tsx` | Métadonnées propres à l'Accueil en anglais | Prévoir l'intention et la langue de la page ; contrôler collisions éventuelles avec le head racine |
| `src/routes/__root.tsx` | `<html lang="fr" dir="ltr">` fixe | Corriger la langue et la direction **dans le rendu serveur**, pas seulement après hydratation côté client |
| `public/robots.txt` | `User-agent: *` et `Allow: /` | Ne définit aucune stratégie d'indexation publique/privée/démo ; ne protège pas des données sensibles |
| `public/sitemap.xml` | Fichier non trouvé au chemin inspecté | Vérifier tout mécanisme alternatif dynamique ; sinon générer sitemap des seules URLs indexables |
| Head racine inspecté | Pas de `rel=canonical` ni de `hreflang` observés | Contrôler éventuels ajouts ailleurs, puis implémenter une politique robuste |
| `vite.config.ts` | TanStack Start, SSR configuré par l'outillage | **La configuration ne démontre pas que le HTML livré aux robots est complet** : tester la réponse HTTP initiale |
| Médias / vidéo | Nouvelle direction couleur et logo B3 validés | Poster d'accueil léger, WebP/AVIF adaptés, film facultatif ; ne pas dégrader les Web Vitals |

Ces constats sont des observations du code accessible, **pas** un audit Search Console ni une preuve d'indexation ou d'absence absolue de balises ailleurs.

## 2. Routage et indexation
1. Inventorier les routes en distinguant : **publiques réelles**, **publiques de démonstration**, **privées/authentifiées**, **non finalisées**.
2. Décider le domaine canonique de production et les URLs linguistiques : par exemple un modèle `/fr/...`, `/en/...`, etc., **à valider avant codage** ; ne pas présumer d'un domaine ni casser les routes et deep links existants.
3. Gérer `canonical` absolue cohérente avec l'URL publique, version linguistique et paramètres ; éviter les canoniques multiples/contradictoires.
4. Produire les liens `hreflang` réciproques FR/EN/ES/PT/ZH/AR seulement pour les pages ayant des versions réellement équivalentes ; `x-default` si stratégie d'accueil validée.
5. Respecter `lang` et `dir` du document HTML dans la **première réponse serveur**, y compris en arabe. Tester le HTML sans JavaScript.
6. Pour contenu privé : authentification réelle, `noindex` côté réponses servies si applicable, absence du sitemap et des liens publics directs. **Ne pas utiliser `Disallow` comme unique mesure de confidentialité**.
7. Pour contenus de démonstration : `noindex` jusqu'à décision éditoriale explicite de publier de vraies données. Séparer les environnements de prévisualisation et de production.

## 3. Métadonnées et données structurées
Chaque page publique indexable a : titre spécifique, description utile, H1 cohérent, URL canonique, image sociale autorisée, Open Graph/Twitter et liens internes descriptifs. Réutiliser B3 dans la carte sociale, sans écraser toutes les images de contenus artistiques avec un logo générique.

Données JSON-LD **uniquement si le contenu les justifie** : `Organization`, `WebSite` pour l'entité et le site ; éventuellement `Person`/`MusicGroup`, `MusicRecording`, `MusicAlbum`, `MusicPlaylist`, `VideoObject`, `BreadcrumbList` selon réalité du contenu et vocabulaire schema.org applicable. Vérifier conformité aux règles du moteur ciblé et absence de propriétés inventées. Ne pas inventer prix, droits, récompenses, notes, avis ni participants. Les données structurées ne garantissent pas les extraits enrichis ni les citations d'IA.

## 4. HTML, accessibilité, performance
- Le robot doit recevoir en HTML initial les informations essentielles des pages indexables ; vérifier réponse HTTP et erreurs SSR pour plusieurs routes, langues et statuts.
- Sémantique : un H1 représentatif, structure H2/H3 logique, lien vers œuvres/artistes, textes visibles, alt pertinents, légendes ou transcription de vidéo quand utile, clavier opérationnel.
- Mesurer Core Web Vitals en conditions réalistes et au 75e percentile si données disponibles : LCP, INP, CLS ; limiter poids des images, polices et scripts. La vidéo de 15 secondes est **volontaire**, la signature de 2–3 s **facultative**, poster et réduction de mouvement disponibles.
- Les œuvres audios restent utilisables sans animation, et le son ne démarre jamais tout seul. Contrastes des titres vérifiés sur des photographies, pas seulement sur un fond plein.

## 5. Sitemap, outils et suivi
Créer/valider un sitemap XML (éventuellement index) avec uniquement les URLs canoniques publiables ; le référencer de manière appropriée dans `robots.txt` **après décision de mise en ligne**. Vérifier codes HTTP, redirects, pages 404, métadonnées sociales, canoniques, sitemap, `noindex` et ressources chargées. Configurer la mesure de recherche (Google Search Console, Bing Webmaster Tools) uniquement après autorisation et maîtrise du domaine.

Les pages GEO sont d'abord des **pages lisibles, crédibles, à faits traçables**, que des moteurs ou assistants peuvent interpréter. Un fichier `llms.txt` ne constitue pas une exigence SEO ni une preuve de visibilité dans les réponses IA ; ne pas le prioriser au détriment de l'architecture d'indexation.

## 6. Ordre de réalisation recommandé
**P0 (avant exposition publique)** : audit des routes et données démo/privées ; stratégie d'indexation ; contrôle SSR/lang/dir ; sécurité.
**P1** : URL/canonicals/`hreflang`, titres/meta/OG B3, contenu de qualité, sitemap et tests automatisés.
**P2** : données structurées réelles, descriptions artistiques, mesures Web Vitals et optimisation médias.
**P3 (après lancement)** : mesures indexation, trafic qualifié, itérations éditoriales et suivi des citations IA réellement observables.

## 7. Validation et non-régression
Recette FR/EN/ES/PT/ZH/AR, 1440/1024/390/320 : vérification `curl`/HTTP brut, moteur sans JS, SSR et page hydratée ; robots/canonicals/hreflang/sitemap cohérents ; routes privées non exposées ; images sociales ; tests actuels, fonctionnement audio, favoris, crédits, auth, Radio et Studio inchangés. Aucune modification de code, Supabase, Cloudflare, DNS ou déploiement sans accord distinct.

**Décisions métier :** [REFERENTIEL_SEO_GEO_FONCTIONNEL.md](./REFERENTIEL_SEO_GEO_FONCTIONNEL.md).
