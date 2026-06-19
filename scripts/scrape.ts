/**
 * Best-effort scraper for Lottotech lottery results.
 *
 * WARNING: This script is fragile — the Lottotech website is WordPress-based
 * with no official API. HTML structure may change at any time.
 * The recommended approach is manual import via /draws/import.
 *
 * Usage: pnpm scrape -- --game=LOTO_VERT|LOTO|LOTO_PLUS
 */

import * as cheerio from "cheerio";
import { PrismaClient, Game } from "@prisma/client";
import { validateNumbers, getDayFromDate } from "../src/lib/games";

const prisma = new PrismaClient();

const URLS: Record<Game, string> = {
  LOTO_VERT: "https://www.lottotech.mu/lotovert/",
  LOTO: "https://www.lottotech.mu/loto/",
  LOTO_PLUS: "https://www.lottotech.mu/loto/",
};

function parseArgs(): Game {
  const arg = process.argv.find((a) => a.startsWith("--game="));
  const game = arg?.split("=")[1] as Game | undefined;
  if (game && Object.values(Game).includes(game)) return game;
  return Game.LOTO_VERT;
}

function extractNumbersFromText(text: string, expectedCount: number): number[] | null {
  const nums = text
    .match(/\b\d+\b/g)
    ?.map(Number)
    .filter((n) => n > 0);

  if (!nums || nums.length < expectedCount) return null;

  const unique = [...new Set(nums)].slice(0, expectedCount);
  return unique.length === expectedCount ? unique.sort((a, b) => a - b) : null;
}

function parseDateFromText(text: string): string | null {
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const fr = text.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i);
  if (fr) {
    const months: Record<string, string> = {
      janvier: "01", février: "02", mars: "03", avril: "04",
      mai: "05", juin: "06", juillet: "07", août: "08",
      septembre: "09", octobre: "10", novembre: "11", décembre: "12",
    };
    const month = months[fr[2].toLowerCase()];
    if (month) {
      return `${fr[3]}-${month}-${fr[1].padStart(2, "0")}`;
    }
  }

  return null;
}

async function scrapeGame(game: Game): Promise<number> {
  const url = URLS[game];
  console.log(`Scraping ${game} from ${url}...`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LottoMU-Scraper/1.0 (personal use)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  let imported = 0;

  const expectedCount = game === Game.LOTO_VERT ? 7 : 6;

  // Try to find draw result blocks — best-effort selectors
  const candidates: { date: string; numbers: number[] }[] = [];

  // Look for date headers near number lists
  $("h2, h3, h4, .draw-date, [class*='draw'], [class*='result']").each((_, el) => {
    const text = $(el).text();
    const date = parseDateFromText(text);
    if (!date) return;

    const sibling = $(el).next();
    const numbers = extractNumbersFromText(sibling.text(), expectedCount);
    if (numbers) {
      candidates.push({ date, numbers });
    }
  });

  // Fallback: scan page text for number sequences near dates
  if (candidates.length === 0) {
    const bodyText = $("body").text();
    const dateMatches = [...bodyText.matchAll(/(\d{4}-\d{2}-\d{2}|\d{1,2}\s+\w+\s+\d{4})/g)];

    for (const match of dateMatches.slice(0, 30)) {
      const date = parseDateFromText(match[0]);
      if (!date) continue;

      const idx = bodyText.indexOf(match[0]);
      const snippet = bodyText.slice(idx, idx + 200);
      const numbers = extractNumbersFromText(snippet, expectedCount);
      if (numbers) {
        candidates.push({ date, numbers });
      }
    }
  }

  const seen = new Set<string>();

  for (const { date, numbers } of candidates) {
    const key = `${game}-${date}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const validation = validateNumbers(numbers, game);
    if (!validation.valid) {
      console.warn(`Skipping ${date}: ${validation.error}`);
      continue;
    }

    const drawDate = new Date(date + "T12:00:00");

    await prisma.draw.upsert({
      where: { game_date: { game, date: drawDate } },
      update: { numbers, day: getDayFromDate(drawDate) },
      create: {
        game,
        date: drawDate,
        day: getDayFromDate(drawDate),
        numbers,
      },
    });

    console.log(`  ✓ ${date}: [${numbers.join(", ")}]`);
    imported++;
  }

  if (imported === 0) {
    console.warn(
      "No draws extracted. The website HTML may have changed.\n" +
        "Use manual import at /draws/import instead."
    );
  }

  return imported;
}

async function main() {
  const game = parseArgs();
  try {
    const count = await scrapeGame(game);
    console.log(`\nDone: ${count} draw(s) imported for ${game}`);
  } catch (error) {
    console.error("Scrape failed:", error);
    console.error("\nFallback: import manually via the web UI at /draws/import");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
