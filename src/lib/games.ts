import { Game } from "@prisma/client";

export type GameColors = {
  ball: string;
  badge: string;
  chipActive: string;
  chipInactive: string;
  accent: string;
};

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
  colors: GameColors;
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
    colors: {
      ball: "bg-emerald-600",
      badge: "bg-emerald-100 text-emerald-800",
      chipActive: "bg-emerald-600 text-white",
      chipInactive:
        "text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-50",
      accent: "border-emerald-500",
    },
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
    colors: {
      ball: "bg-red-600",
      badge: "bg-red-100 text-red-700",
      chipActive: "bg-red-600 text-white",
      chipInactive: "text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50",
      accent: "border-red-500",
    },
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
    colors: {
      ball: "bg-blue-900",
      badge: "bg-blue-100 text-blue-900 ring-1 ring-inset ring-red-300",
      chipActive: "bg-blue-900 text-white",
      chipInactive:
        "text-blue-900 ring-1 ring-inset ring-blue-200 hover:bg-blue-50",
      accent: "border-blue-900",
    },
  },
};

export const GAME_LIST = Object.values(GAMES);

export type DrawFilter = Game;

export const DRAW_FILTER_OPTIONS: {
  value: DrawFilter;
  label: string;
  description: string;
}[] = [
  {
    value: "LOTO_VERT",
    label: "Loto Vert",
    description: "7 numéros · Mar & Ven",
  },
  {
    value: "LOTO",
    label: "Loto",
    description: "6 numéros · Mer & Sam",
  },
  {
    value: "LOTO_PLUS",
    label: "Loto+",
    description: "6 numéros · Mer & Sam",
  },
];

export function parseDrawFilter(value?: string): DrawFilter | undefined {
  if (!value) return undefined;
  if (value === "LOTO_VERT" || value === "LOTO" || value === "LOTO_PLUS") {
    return value;
  }
  // Rétrocompatibilité avec l'ancien filtre regroupé
  if (value === "LOTO_FAMILY") return "LOTO";
  return undefined;
}

export function getDrawFilterLabel(filter?: DrawFilter): string {
  if (!filter) return "";
  return DRAW_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "";
}

export function getDrawGroupLabel(game: Game): string {
  return GAMES[game].shortName;
}

export function getGameConfig(game: Game): GameConfig {
  return GAMES[game];
}

export function getGameColors(game: Game): GameColors {
  return GAMES[game].colors;
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

export const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const FRENCH_DRAW_DAYS: Record<string, string> = {
  Sunday: "Dimanche",
  Monday: "Lundi",
  Tuesday: "Mardi",
  Wednesday: "Mercredi",
  Thursday: "Jeudi",
  Friday: "Vendredi",
  Saturday: "Samedi",
};

export function getDrawDayIndices(game: Game): number[] {
  return getGameConfig(game).drawDays.map((day) => WEEKDAY_INDEX[day]);
}

export function isValidDrawDate(game: Game, date: Date): boolean {
  return getDrawDayIndices(game).includes(date.getDay());
}

export function formatDrawDays(drawDays: string[]): string {
  const labels = drawDays.map((day) => FRENCH_DRAW_DAYS[day] ?? day);
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

export const ANTHROPIC_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
] as const;

export const RETIRED_ANTHROPIC_MODELS: Record<string, string> = {
  "claude-sonnet-4-20250514": "claude-sonnet-4-6",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
  "claude-3-opus-20240229": "claude-opus-4-6",
  "claude-3-7-sonnet-20250219": "claude-sonnet-4-6",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-6",
};
