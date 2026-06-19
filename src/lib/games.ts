import { Game } from "@prisma/client";

export type GameConfig = {
  id: Game;
  name: string;
  shortName: string;
  count: number;
  min: number;
  max: number;
  drawDays: string[];
  tiers: { matches: number; label: string }[];
  ranges?: { label: string; min: number; max: number }[];
};

export const GAMES: Record<Game, GameConfig> = {
  LOTO_VERT: {
    id: "LOTO_VERT",
    name: "Loto Vert",
    shortName: "Loto Vert",
    count: 7,
    min: 1,
    max: 28,
    drawDays: ["Tuesday", "Friday"],
    tiers: [
      { matches: 7, label: "7 of 7" },
      { matches: 6, label: "6 of 7" },
      { matches: 5, label: "5 of 7" },
      { matches: 4, label: "4 of 7" },
    ],
    ranges: [
      { label: "low", min: 1, max: 9 },
      { label: "mid", min: 10, max: 19 },
      { label: "high", min: 20, max: 28 },
    ],
  },
  LOTO: {
    id: "LOTO",
    name: "Loto",
    shortName: "Loto",
    count: 6,
    min: 1,
    max: 40,
    drawDays: ["Wednesday", "Saturday"],
    tiers: [
      { matches: 6, label: "6 of 6" },
      { matches: 5, label: "5 of 6" },
      { matches: 4, label: "4 of 6" },
      { matches: 3, label: "3 of 6" },
    ],
    ranges: [
      { label: "low", min: 1, max: 13 },
      { label: "mid", min: 14, max: 27 },
      { label: "high", min: 28, max: 40 },
    ],
  },
  LOTO_PLUS: {
    id: "LOTO_PLUS",
    name: "Loto+",
    shortName: "Loto+",
    count: 6,
    min: 1,
    max: 40,
    drawDays: ["Wednesday", "Saturday"],
    tiers: [
      { matches: 6, label: "6 of 6" },
      { matches: 5, label: "5 of 6" },
      { matches: 4, label: "4 of 6" },
      { matches: 3, label: "3 of 6" },
    ],
    ranges: [
      { label: "low", min: 1, max: 13 },
      { label: "mid", min: 14, max: 27 },
      { label: "high", min: 28, max: 40 },
    ],
  },
};

export const GAME_LIST = Object.values(GAMES);

export function getGameConfig(game: Game): GameConfig {
  return GAMES[game];
}

export function validateNumbers(
  numbers: number[],
  game: Game
): { valid: boolean; error?: string } {
  const config = getGameConfig(game);

  if (numbers.length !== config.count) {
    return {
      valid: false,
      error: `Expected ${config.count} numbers, got ${numbers.length}`,
    };
  }

  const unique = new Set(numbers);
  if (unique.size !== numbers.length) {
    return { valid: false, error: "Numbers must be distinct" };
  }

  for (const n of numbers) {
    if (!Number.isInteger(n) || n < config.min || n > config.max) {
      return {
        valid: false,
        error: `Each number must be between ${config.min} and ${config.max}`,
      };
    }
  }

  return { valid: true };
}

export function getTierLabel(game: Game, matchCount: number): string | null {
  const config = getGameConfig(game);
  const tier = config.tiers.find((t) => t.matches === matchCount);
  return tier?.label ?? null;
}

export function getDayFromDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { id: "claude-3-opus-20240229", label: "Claude 3 Opus" },
] as const;
