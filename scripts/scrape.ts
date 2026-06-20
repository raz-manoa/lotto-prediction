/**
 * Scraper for Lottotech lottery results via the WordPress admin-ajax API.
 *
 * Usage: pnpm scrape -- --game=LOTO_VERT|LOTO|LOTO_PLUS [--days=90]
 */

import * as cheerio from "cheerio";
import { PrismaClient, Game } from "@prisma/client";
import {
  validateNumbers,
  getDayFromDate,
  isValidDrawDate,
  getGameConfig,
} from "../src/lib/games";

const prisma = new PrismaClient();

const AJAX_URL = "https://www.lottotech.mu/wp-admin/admin-ajax.php";
const REQUEST_DELAY_MS = 300;

const ENDPOINTS: Record<
  Game,
  { action: string; gameParam: string; referer: string }
> = {
  LOTO: {
    action: "loto_searchByDate",
    gameParam: "loto",
    referer: "https://www.lottotech.mu/loto/",
  },
  LOTO_PLUS: {
    action: "loto_searchByDate",
    gameParam: "loto",
    referer: "https://www.lottotech.mu/loto/",
  },
  LOTO_VERT: {
    action: "lotovert_searchByDate",
    gameParam: "lotovert",
    referer: "https://www.lottotech.mu/lotovert/",
  },
};

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

const ENGLISH_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

type LotoAjaxResponse = {
  archive?: {
    date?: string;
    loto_ball?: string;
    lotoplus_ball?: string;
    loto_win?: string;
    lotoplus_win?: string;
  };
  popup?: {
    date?: string;
  };
};

type LotoVertAjaxResponse = {
  date_jour?: string;
  date_mois?: string;
  winning_number?: string;
};

function parseArgs(): { game: Game; days: number } {
  const gameArg = process.argv.find((a) => a.startsWith("--game="));
  const game = gameArg?.split("=")[1] as Game | undefined;
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 90;

  return {
    game: game && Object.values(Game).includes(game) ? game : Game.LOTO_VERT,
    days: Number.isFinite(days) && days > 0 ? days : 90,
  };
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function generateDrawDates(game: Game, days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    if (isValidDrawDate(game, date)) {
      dates.push(date);
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

function parseEnglishPopupDate(text: string): string | null {
  const match = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i
  );
  if (!match) return null;

  const month = ENGLISH_MONTHS[match[2].toLowerCase()];
  if (!month) return null;

  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function parseFrenchDateMois(text: string): { day: number; month: number } | null {
  const match = text.match(/^(\d{1,2})\s+(\S+)/i);
  if (!match) return null;

  const month = FRENCH_MONTHS[match[2].toLowerCase()];
  if (!month) return null;

  return { day: parseInt(match[1], 10), month };
}

function matchesRequestedDate(requested: Date, dateMois: string): boolean {
  const parsed = parseFrenchDateMois(dateMois);
  if (!parsed) return false;

  return (
    parsed.day === requested.getDate() &&
    parsed.month === requested.getMonth() + 1
  );
}

function extractLotoNumbers(html: string): number[] {
  const $ = cheerio.load(html);
  return $(".jackpot-number__digits")
    .map((_, el) => parseInt($(el).text().trim(), 10))
    .get()
    .filter((n) => Number.isFinite(n));
}

function extractLotoVertNumbers(html: string): number[] {
  const $ = cheerio.load(html);
  const fromOval = $(".winning-number__digit-oval span")
    .map((_, el) => parseInt($(el).text().trim(), 10))
    .get()
    .filter((n) => Number.isFinite(n));

  if (fromOval.length > 0) return fromOval;

  return $(".winning-number__digit")
    .map((_, el) => parseInt($(el).text().trim(), 10))
    .get()
    .filter((n) => Number.isFinite(n));
}

async function fetchDraw(
  date: Date,
  game: Game
): Promise<LotoAjaxResponse | LotoVertAjaxResponse> {
  const endpoint = ENDPOINTS[game];
  const dateStr = toIsoDate(date);

  const response = await fetch(AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: endpoint.referer,
      "User-Agent": "LottoMU-Scraper/1.0 (personal use)",
    },
    body: new URLSearchParams({
      action: endpoint.action,
      date: dateStr,
      game: endpoint.gameParam,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${dateStr} (${game})`);
  }

  return response.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importDraw(
  game: Game,
  date: Date,
  numbers: number[]
): Promise<void> {
  await prisma.draw.upsert({
    where: { game_date: { game, date } },
    update: { numbers, day: getDayFromDate(date) },
    create: {
      game,
      date,
      day: getDayFromDate(date),
      numbers,
    },
  });
}

async function scrapeLotoFamily(game: Game, days: number): Promise<number> {
  const config = getGameConfig(game);
  const htmlField = game === Game.LOTO ? "loto_ball" : "lotoplus_ball";
  const dates = generateDrawDates(game, days);
  let imported = 0;

  console.log(
    `Scraping ${game} via AJAX (${dates.length} draw day(s) in last ${days} days)...`
  );

  for (let i = 0; i < dates.length; i++) {
    const requestedDate = dates[i];
    const requestedIso = toIsoDate(requestedDate);

    try {
      const json = (await fetchDraw(
        requestedDate,
        game
      )) as LotoAjaxResponse;

      const html = json.archive?.[htmlField] ?? "";
      if (!html.trim()) continue;

      const numbers = extractLotoNumbers(html);
      if (numbers.length !== config.count) continue;

      const popupDate = json.popup?.date;
      const canonicalIso = popupDate
        ? parseEnglishPopupDate(popupDate)
        : requestedIso;

      if (!canonicalIso || canonicalIso !== requestedIso) continue;

      const validation = validateNumbers(numbers, game);
      if (!validation.valid) {
        console.warn(`Skipping ${requestedIso}: ${validation.error}`);
        continue;
      }

      const drawDate = new Date(canonicalIso + "T12:00:00");
      await importDraw(game, drawDate, numbers);
      console.log(`  ✓ ${canonicalIso}: [${numbers.join(", ")}]`);
      imported++;
    } catch (error) {
      console.warn(`  ✗ ${requestedIso}: ${error}`);
    }

    if (i < dates.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return imported;
}

async function scrapeLotoVert(days: number): Promise<number> {
  const config = getGameConfig(Game.LOTO_VERT);
  const dates = generateDrawDates(Game.LOTO_VERT, days);
  let imported = 0;

  console.log(
    `Scraping LOTO_VERT via AJAX (${dates.length} draw day(s) in last ${days} days)...`
  );

  for (let i = 0; i < dates.length; i++) {
    const requestedDate = dates[i];
    const requestedIso = toIsoDate(requestedDate);

    try {
      const json = (await fetchDraw(
        requestedDate,
        Game.LOTO_VERT
      )) as LotoVertAjaxResponse;

      const html = json.winning_number ?? "";
      if (!html.trim()) continue;

      if (json.date_mois && !matchesRequestedDate(requestedDate, json.date_mois)) {
        continue;
      }

      const numbers = extractLotoVertNumbers(html);
      if (numbers.length !== config.count) continue;

      const validation = validateNumbers(numbers, Game.LOTO_VERT);
      if (!validation.valid) {
        console.warn(`Skipping ${requestedIso}: ${validation.error}`);
        continue;
      }

      await importDraw(Game.LOTO_VERT, requestedDate, numbers);
      console.log(`  ✓ ${requestedIso}: [${numbers.join(", ")}]`);
      imported++;
    } catch (error) {
      console.warn(`  ✗ ${requestedIso}: ${error}`);
    }

    if (i < dates.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return imported;
}

async function scrapeGame(game: Game, days: number): Promise<number> {
  if (game === Game.LOTO_VERT) {
    return scrapeLotoVert(days);
  }
  return scrapeLotoFamily(game, days);
}

async function main() {
  const { game, days } = parseArgs();

  try {
    const count = await scrapeGame(game, days);

    if (count === 0) {
      console.warn(
        "No draws imported. Check --days, connectivity, or use manual import at /draws/import."
      );
    }

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
