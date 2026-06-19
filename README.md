# Lotto MU — Prédictions Loto Vert, Loto & Loto+

Application Next.js pour gérer les tirages historiques et générer des prédictions IA pour les loteries mauriciennes (Lottotech).

## Jeux supportés

| Jeu | Numéros | Plage | Tirages |
|-----|---------|-------|---------|
| Loto Vert | 7 | 1–28 | Mardi & Vendredi |
| Loto | 6 | 1–40 | Mercredi & Samedi |
| Loto+ | 6 | 1–40 | Mercredi & Samedi |

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL (Neon)
- Auth.js (NextAuth v5) — authentification par email/mot de passe
- Vercel AI SDK + Claude (BYOK — chaque utilisateur configure sa propre clé API)

## Démarrage

```bash
cp .env.example .env
# Remplir DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY

pnpm install
pnpm exec prisma db push
pnpm db:seed

pnpm dev
```

**Base de données locale** — Postgres doit tourner sur `localhost:5432`. Créez la base :

```bash
createdb lotto   # ou: psql -c "CREATE DATABASE lotto;"
```

Puis dans `.env` :

```
DATABASE_URL="postgresql://VOTRE_USER@localhost:5432/lotto?schema=public"
```

Alternative Docker (port 5433) :

```bash
docker compose up -d
# DATABASE_URL="postgresql://lotto:lotto@localhost:5433/lotto?schema=public"
```

Générer les secrets :
```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY
```

## Structure du projet

```
src/
├── app/              # Routes Next.js (App Router)
├── components/       # Composants UI
├── lib/              # Logique métier, actions, auth
├── types/            # Types TypeScript
└── middleware.ts     # Protection des routes
prisma/               # Schéma et seed
scripts/              # Scraper et scripts utilitaires
data/                 # Données historiques JSON
```

## Pages

- `/draws` — Consulter l'historique et les stats
- `/draws/import` — Importer des tirages (formulaire, masse, JSON)
- `/predict` — Générer des prédictions IA
- `/tickets` — Tickets sauvegardés à jouer
- `/verify` — Vérifier les tickets contre un tirage réel
- `/settings` — Configuration IA (modèle, clé API chiffrée)

## Scraper (optionnel, fragile)

```bash
pnpm scrape -- --game=LOTO_VERT
pnpm scrape -- --game=LOTO
```

Le scraper est best-effort — l'import manuel via `/draws/import` reste la méthode fiable.

## Disclaimer

Les résultats de loterie sont fondamentalement aléatoires. Les tickets générés sont des suggestions heuristiques basées sur les données passées et ne garantissent aucun gain.
