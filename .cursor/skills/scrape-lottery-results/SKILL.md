---
name: scrape-lottery-results
description: Runs the Lottotech lottery scraper to import Loto, Loto+ and Loto Vert draws into the database. Use when the user asks to scrape, fetch, update or import lottery results or draws from lottotech.mu.
---

# Scrape Lottery Results

## Prerequisites

1. Database running: `docker compose up -d`
2. `DATABASE_URL` set in `.env`

## Commands

Run one game at a time (default window: 90 days):

```bash
# Recent import
pnpm scrape -- --game=LOTO_VERT --days=90
pnpm scrape -- --game=LOTO --days=90
pnpm scrape -- --game=LOTO_PLUS --days=90

# Backfill: N days before oldest draw in DB (re-run until 0 imports)
pnpm scrape -- --game=LOTO --days=90 --backfill
```

| Game | Flag | Numbers | Draw days |
|------|------|---------|-----------|
| Loto Vert | `LOTO_VERT` (default) | 7 (1–28) | Tuesday, Friday |
| Loto | `LOTO` | 6 (1–40) | Wednesday, Saturday |
| Loto+ | `LOTO_PLUS` | 6 (1–40) | Wednesday, Saturday |

Loto and Loto+ share the same draw page but **must be scraped separately** with two commands.

Adjust `--days` for a shorter or longer window (e.g. `--days=14` for recent draws only).

### Backfill workflow

1. Import recent: `pnpm scrape -- --game=LOTO --days=90`
2. Backfill older: `pnpm scrape -- --game=LOTO --days=90 --backfill`
3. Re-run step 2 until `0 draw(s) imported` (history exhausted)

With `--backfill`, the script finds the oldest draw for the game in the database and scrapes the N calendar days before that date. If the database is empty, it falls back to recent import.

## Expected output

```
Scraping LOTO via AJAX (8 draw day(s) in last 14 days)...
  ✓ 2026-06-17: [11, 12, 14, 32, 34, 36]
  ✓ 2026-06-13: [1, 10, 16, 17, 24, 26]

Done: 2 draw(s) imported for LOTO
```

## API reference (for debugging)

Endpoint: `POST https://www.lottotech.mu/wp-admin/admin-ajax.php`

| Game | action | game param | Response fields |
|------|--------|------------|-----------------|
| Loto / Loto+ | `loto_searchByDate` | `loto` | `archive.loto_ball`, `archive.lotoplus_ball`, `popup.date` |
| Loto Vert | `lotovert_searchByDate` | `lotovert` | `winning_number`, `date_mois` |

Numbers are embedded as HTML inside JSON (`.jackpot-number__digits` for Loto, `.winning-number__digit-oval span` for Loto Vert).

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `0 draw(s) imported` (recent) | Increase `--days`, check network, verify DB is up |
| `0 draw(s) imported` (backfill) | History may be exhausted — re-run once to confirm, then stop |
| HTTP error | Site may be down or blocking requests; retry later |
| Validation skip | Numbers out of range — API HTML may have changed |
| Prisma connection error | Start Postgres: `docker compose up -d` |

**Fallback:** manual import at `/draws/import` in the web UI, or paste JSON from `data/history.json`.
