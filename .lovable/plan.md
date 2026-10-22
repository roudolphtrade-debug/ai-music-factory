# Contrôle préalable à recette · commit a622e41

## 1. Constats (lecture seule, 22/10/2026)
- HEAD `a622e41f22bf8e190f6e6826809fe3ec22aaef8d` (« Merge pull request #3 », 17:03 +0200), branche de travail `edit/edt-cd72bc49-…`, aucun changement local.
- Serveur de développement : actif sur localhost:8080. Aucune entrée d'erreur dans le journal de build de l'aperçu (fichier vide pour ce message) : pas de preuve datée « build OK » pour ce commit.
- Build production local : non exécuté (le mode Plan interdit toute commande qui écrit des fichiers ; aucun dossier `dist`/`.output` présent).
- Déploiement hébergé : aucune preuve que ce commit soit publié ; l'aperçu hébergé exige une connexion Lovable, non inspectable ici.

## 2. AI_ROUTES_PAUSED
- Câblage : `src/lib/api-guard.ts`, lu dans `process.env` à chaque requête ; valeurs « 1/true/yes/on » = pause (503 sans appel amont). Testé dans `src/routes/api/-ai-routes.test.ts`.
- Présence : absente des secrets du projet (seul `LOVABLE_API_KEY`, géré, est déclaré) et absente de l'environnement du bac à sable.
- État effectif : non attesté. Aucune variable déclarée ; le repli du code n'est pas retenu comme preuve. Aucune portée aperçu/production distincte n'existe.
- Accès manquant : lecture de l'environnement réel du serveur publié.

## 3. Recette proposée (non exécutée, une tentative chacune)
| Route | Modèle | URL amont | Plafonds |
|---|---|---|---|
| POST /api/studio/generate | google/gemini-3-flash-preview puis openai/gpt-4o-mini-tts | ai.gateway.lovable.dev/v1 (chat + audio/speech) | 200 jetons, 600 caractères |
| POST /api/voice/speak | openai/gpt-4o-mini-tts | …/v1/audio/speech | 800 caractères |
| POST /api/voice/transcribe | openai/gpt-4o-mini-transcribe | …/v1/audio/transcriptions | 6 Mo, 120 s |

- Budget : faible mais non chiffrable à l'avance ; coût réel lisible après coup dans le journal des requêtes IA du projet (accessible).
- Preuves de succès : HTTP 200 ; generate = paroles + MP3 lisible ; speak = `audio/mpeg` non vide ; transcribe = texte cohérent avec l'échantillon. 503 = pause active, 402/429 = crédits/débit.
- Crédits locaux : lire `afm-credits` dans le navigateur avant et après (compteur de démonstration, sans lien avec la facturation).
- Mesure fournisseur : coût en crédits Lovable par requête via le journal IA ; facture en euros non accessible.

## 4. Étape suivante si approuvée
Exécuter uniquement le build production local (sans installation, sans toucher Git) et en rapporter la date et le résultat. Aucun appel IA tant que vous ne l'autorisez pas explicitement.
