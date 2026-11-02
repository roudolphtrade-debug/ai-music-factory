# Bilan de faisabilité : écoute Lyria préenregistrée et pilote privé PR #18

Lecture seule. Aucun fichier de l'application modifié, aucune commande changeant l'état.

## 1. Faits constatés dans le projet Lovable
- HEAD = `512c46c` (« fix(studio): P0 … (#17) »), aucun changement local.
- Routes IA serveur présentes : `api/studio/generate`, `api/voice/speak`, `api/voice/transcribe`, toutes protégées par `src/lib/api-guard.ts`.
- `AI_ROUTES_PAUSED` : absente ou illisible = pause (fail-closed). Ouverture seulement avec `0/false/no/off`. Valeur actuelle non lue (secret non affiché).
- Aucun fichier `wrangler.*` dans le dépôt. Le build passe par nitro avec la cible Cloudflare par défaut. Aucun binding D1, R2 ou KV déclaré ni utilisé dans `src/`.
- Aucune mention Lyria/Google dans `src/` de `main` : le code de la PR #18 n'est pas présent ici.
- Un dossier `supabase/` (migrations, preflight, verify) existe ; je n'ai pas vérifié d'ici l'état réel de cette base ni des tables.

## 2. Réponse sur D1/R2 et les secrets
- **Constaté** : rien dans ce projet ne déclare ni n'expose de binding D1 ou R2. Lovable ne m'a montré aucun mécanisme qui permettrait de les ajouter.
- **Conséquence** : un quota D1 ou un stockage R2 « prévu » dans la PR #18 ne fonctionnera pas tel quel dans l'hébergement Lovable.
- **Chemin proposé, sans toucher à aimf-dev** :
  - Quota et propriétaire : utiliser une table protégée dans la base déjà rattachée au projet, à confirmer, ou un compteur côté serveur.
  - Stockage privé des 3 MP3 : stockage privé à accès signé de courte durée, servi uniquement par une route serveur qui vérifie le propriétaire.
  - Option alternative : garder D1/R2 dans un Worker Cloudflare séparé appartenant à l'utilisateur, appelé depuis le serveur Lovable avec un secret partagé. Cela demande de se connecter à Cloudflare, ce qui est interdit à ce stade.
- **Secrets requis** pour le pilote :
  - accès Google Lyria, ou passerelle Lovable AI si Lyria y figure (non vérifié ici, aucun appel au catalogue effectué) ;
  - identité du propriétaire ;
  - `AI_ROUTES_PAUSED`.
  - Leur présence en production n'a pas été vérifiée.

## 3. Aperçu vs production
- L'aperçu et le site publié partagent le même code. La pause fail-closed protège le site public tant que la variable reste fermée.
- L'aperçu hébergé redirige vers l'authentification Lovable et n'a pas pu être inspecté de façon automatisée.
- Une publication rend tout le code de la branche synchronisée public, y compris le code des routes privées. Il faut donc une protection serveur, pas seulement une interface masquée.

## 4. GitHub
- Ne jamais commiter les MP3 ni les paroles ; le dépôt est public.
- PR #18 (brouillon) et `feat/demo-lyria-preenregistre` (`19a35da`, locale, non poussée) : l'intégration passe par une fusion dans `main` sur GitHub, que Lovable récupère ensuite. Lovable ne voit pas la branche locale.
- Avant fusion, retirer de la PR #18 toute dépendance D1/R2 ou la remplacer par le chemin du §2.

## 5. Coûts
- **Crédits Lovable** : messages de l'agent ; passerelle Lovable AI si un modèle musical y est utilisé (tarif lisible via le catalogue, non consulté) ; Cloud, stockage et base selon l'usage.
- **Google Lyria** : facturé par Google si l'appel est direct avec une clé propre ; tarif non vérifié ici.
- **Cloudflare** : seulement si l'option Worker/D1/R2 séparée est choisie ; facturé sur le compte Cloudflare de l'utilisateur.
- Écouter les 3 morceaux préenregistrés ne coûte aucune génération, seulement le stockage et la bande passante.

## 6. Risques bloquants
1. D1/R2 non exposés : la PR #18 ne peut pas être fusionnée telle quelle.
2. Fournisseur Lyria non vérifié : catalogue de la passerelle ou clé Google directe à confirmer.
3. Stockage privé des MP3 non choisi ni créé.
4. Contrôle propriétaire : il doit s'exécuter côté serveur et rester fermé par défaut.

## 7. Séquence de reprise (après accord)
1. Vous choisissez le stockage et le quota : base du projet ou Worker Cloudflare séparé.
2. Vérification en lecture du catalogue de modèles et des secrets présents, sans appel de génération.
3. Lot A, écoute préenregistrée : route serveur privée, MP3 envoyés hors GitHub, section d'écoute réservée au propriétaire, mention « préenregistré ». Pause IA inchangée.
4. Recette du Lot A dans l'aperçu.
5. Lot B : adapter la PR #18 au stockage retenu, CI verte, fusion, puis recette avec une seule génération autorisée explicitement.
6. Publication seulement après votre accord.

## 8. Décision
- **Lot A (écoute préenregistrée)** : GO conditionnel, dès que le stockage privé est choisi.
- **Lot B (génération PR #18)** : NO-GO en l'état, tant que la dépendance D1/R2 n'est pas remplacée et que le fournisseur et les secrets Lyria ne sont pas confirmés.
