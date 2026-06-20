import { Game } from "@prisma/client";
import { getGameConfig, type GameConfig } from "./games";

export type DrawRecord = {
  date: string;
  day?: string;
  numbers: number[];
};

export type FrequencyEntry = {
  number: number;
  frequency: number;
  percentage: number;
};

export type RecencyEntry = {
  number: number;
  drawsAgo: number | null;
  status: "recent" | "moderate" | "overdue" | "never";
};

export type RangeDistribution = {
  label: string;
  min: number;
  max: number;
  count: number;
  numbers: number[];
};

export type AvgRangeDistribution = {
  label: string;
  avgPerDraw: number;
};

export type DrawAnalysis = {
  totalDraws: number;
  frequencies: FrequencyEntry[];
  recency: RecencyEntry[];
  hotNumbers: number[];
  coldNumbers: number[];
  overdueNumbers: number[];
  rangeDistribution: RangeDistribution[];
  avgRangeDistribution: AvgRangeDistribution[];
};

export type SegmentAnalysis = {
  key: string;
  label: string;
  totalDraws: number;
  analysis: DrawAnalysis;
};

export type CompositeScoreComponents = {
  freqGlobal: number;
  freqRecent: number;
  overdue: number;
  dayAffinity: number;
};

export type CompositeScore = {
  number: number;
  score: number;
  components: CompositeScoreComponents;
};

export type ExtendedAnalysis = {
  global: DrawAnalysis;
  windows: SegmentAnalysis[];
  byDay: SegmentAnalysis[];
  composite: CompositeScore[];
};

const TIME_WINDOWS = [
  { key: "2w", label: "2 semaines", days: 14 },
  { key: "1m", label: "1 mois", days: 30 },
  { key: "3m", label: "3 mois", days: 90 },
  { key: "1y", label: "1 an", days: 365 },
] as const;

// Poids du score composite : récence récente pèse un peu plus, le reste équilibre régularité / retard / jour.
const COMPOSITE_WEIGHTS = {
  freqGlobal: 0.25,
  freqRecent: 0.3,
  overdue: 0.25,
  dayAffinity: 0.2,
} as const;

const FRENCH_DAY_LABELS: Record<string, string> = {
  Sunday: "Dimanche",
  Monday: "Lundi",
  Tuesday: "Mardi",
  Wednesday: "Mercredi",
  Thursday: "Jeudi",
  Friday: "Vendredi",
  Saturday: "Samedi",
};

function parseDrawDate(date: string): Date {
  return new Date(date + "T12:00:00");
}

function sortDrawsDesc(draws: DrawRecord[]): DrawRecord[] {
  return [...draws].sort(
    (a, b) => parseDrawDate(b.date).getTime() - parseDrawDate(a.date).getTime()
  );
}

function filterByWindow(draws: DrawRecord[], days: number): DrawRecord[] {
  const sorted = sortDrawsDesc(draws);
  if (sorted.length === 0) return [];

  const latestDate = parseDrawDate(sorted[0].date);
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - days);

  return sorted.filter((draw) => parseDrawDate(draw.date) >= cutoff);
}

function normalizeValues(values: Map<number, number>): Map<number, number> {
  const max = Math.max(...values.values(), 1);
  const normalized = new Map<number, number>();
  for (const [key, value] of values) {
    normalized.set(key, value / max);
  }
  return normalized;
}

function frequencyMap(
  analysis: DrawAnalysis,
  config: GameConfig
): Map<number, number> {
  const map = new Map<number, number>();
  for (let n = config.min; n <= config.max; n++) {
    map.set(n, 0);
  }
  for (const entry of analysis.frequencies) {
    map.set(entry.number, entry.percentage / 100);
  }
  return map;
}

function overdueMap(
  recency: RecencyEntry[],
  config: GameConfig
): Map<number, number> {
  const map = new Map<number, number>();
  let maxAgo = 0;

  for (const entry of recency) {
    if (entry.drawsAgo !== null) {
      maxAgo = Math.max(maxAgo, entry.drawsAgo);
    }
  }

  const effectiveMax = Math.max(maxAgo + 1, 1);

  for (let n = config.min; n <= config.max; n++) {
    map.set(n, 0);
  }

  for (const entry of recency) {
    const drawsAgo = entry.drawsAgo ?? effectiveMax;
    map.set(entry.number, drawsAgo / effectiveMax);
  }

  return map;
}

function dayAffinityMap(
  byDay: SegmentAnalysis[],
  drawDays: string[],
  config: GameConfig
): Map<number, number> {
  const map = new Map<number, number>();
  for (let n = config.min; n <= config.max; n++) {
    map.set(n, 0);
  }

  const relevant = byDay.filter((segment) => drawDays.includes(segment.key));
  if (relevant.length === 0) return map;

  for (const segment of relevant) {
    for (const entry of segment.analysis.frequencies) {
      map.set(
        entry.number,
        (map.get(entry.number) ?? 0) + entry.percentage / 100
      );
    }
  }

  for (let n = config.min; n <= config.max; n++) {
    map.set(n, (map.get(n) ?? 0) / relevant.length);
  }

  return normalizeValues(map);
}

function computeComposite(
  global: DrawAnalysis,
  recent: DrawAnalysis,
  byDay: SegmentAnalysis[],
  game: Game
): CompositeScore[] {
  const config = getGameConfig(game);
  const globalFreq = normalizeValues(frequencyMap(global, config));
  const recentFreq = normalizeValues(frequencyMap(recent, config));
  const overdue = normalizeValues(overdueMap(global.recency, config));
  const dayAffinity = dayAffinityMap(byDay, config.drawDays, config);

  const scores: CompositeScore[] = [];

  for (let n = config.min; n <= config.max; n++) {
    const components: CompositeScoreComponents = {
      freqGlobal: Math.round((globalFreq.get(n) ?? 0) * 100),
      freqRecent: Math.round((recentFreq.get(n) ?? 0) * 100),
      overdue: Math.round((overdue.get(n) ?? 0) * 100),
      dayAffinity: Math.round((dayAffinity.get(n) ?? 0) * 100),
    };

    const raw =
      COMPOSITE_WEIGHTS.freqGlobal * (globalFreq.get(n) ?? 0) +
      COMPOSITE_WEIGHTS.freqRecent * (recentFreq.get(n) ?? 0) +
      COMPOSITE_WEIGHTS.overdue * (overdue.get(n) ?? 0) +
      COMPOSITE_WEIGHTS.dayAffinity * (dayAffinity.get(n) ?? 0);

    scores.push({
      number: n,
      score: Math.round(raw * 100),
      components,
    });
  }

  return scores.sort((a, b) => b.score - a.score);
}

export function analyzeExtended(
  draws: DrawRecord[],
  game: Game
): ExtendedAnalysis {
  const sortedDraws = sortDrawsDesc(draws);
  const global = analyzeDraws(sortedDraws, game);

  const windows: SegmentAnalysis[] = TIME_WINDOWS.map((window) => {
    const filtered = filterByWindow(sortedDraws, window.days);
    return {
      key: window.key,
      label: window.label,
      totalDraws: filtered.length,
      analysis: analyzeDraws(filtered, game),
    };
  });

  windows.push({
    key: "global",
    label: "Global",
    totalDraws: sortedDraws.length,
    analysis: global,
  });

  const dayGroups = new Map<string, DrawRecord[]>();
  for (const draw of sortedDraws) {
    const day = draw.day ?? "Unknown";
    const existing = dayGroups.get(day) ?? [];
    existing.push(draw);
    dayGroups.set(day, existing);
  }

  const config = getGameConfig(game);
  const orderedDays = [
    ...config.drawDays,
    ...[...dayGroups.keys()].filter((day) => !config.drawDays.includes(day)),
  ];

  const byDay: SegmentAnalysis[] = orderedDays
    .filter((day) => dayGroups.has(day))
    .map((day) => {
      const dayDraws = dayGroups.get(day) ?? [];
      return {
        key: day,
        label: FRENCH_DAY_LABELS[day] ?? day,
        totalDraws: dayDraws.length,
        analysis: analyzeDraws(dayDraws, game),
      };
    });

  const recentWindow =
    windows.find((window) => window.key === "1m")?.analysis ?? global;

  const composite = computeComposite(global, recentWindow, byDay, game);

  return {
    global,
    windows,
    byDay,
    composite,
  };
}

export function analyzeDraws(
  draws: DrawRecord[],
  game: Game
): DrawAnalysis {
  const config = getGameConfig(game);
  const sortedDraws = [...draws].sort(
    (a, b) => parseDrawDate(b.date).getTime() - parseDrawDate(a.date).getTime()
  );

  const totalDraws = sortedDraws.length;
  const freqMap = new Map<number, number>();
  const lastSeen = new Map<number, number | null>();

  for (let i = config.min; i <= config.max; i++) {
    freqMap.set(i, 0);
    lastSeen.set(i, null);
  }

  sortedDraws.forEach((draw, index) => {
    for (const num of draw.numbers) {
      freqMap.set(num, (freqMap.get(num) ?? 0) + 1);
      if (lastSeen.get(num) === null) {
        lastSeen.set(num, index);
      }
    }
  });

  const frequencies: FrequencyEntry[] = [];
  for (let n = config.min; n <= config.max; n++) {
    const frequency = freqMap.get(n) ?? 0;
    frequencies.push({
      number: n,
      frequency,
      percentage: totalDraws > 0 ? Math.round((frequency / totalDraws) * 1000) / 10 : 0,
    });
  }

  frequencies.sort((a, b) => b.frequency - a.frequency);

  const recency: RecencyEntry[] = [];
  for (let n = config.min; n <= config.max; n++) {
    const drawsAgo = lastSeen.get(n) ?? null;
    let status: RecencyEntry["status"];
    if (drawsAgo === null) {
      status = "never";
    } else if (drawsAgo <= 2) {
      status = "recent";
    } else if (drawsAgo <= 7) {
      status = "moderate";
    } else {
      status = "overdue";
    }
    recency.push({
      number: n,
      drawsAgo,
      status,
    });
  }

  const hotNumbers = frequencies.slice(0, 5).map((f) => f.number);
  const coldNumbers = [...frequencies]
    .sort((a, b) => a.frequency - b.frequency)
    .slice(0, 5)
    .map((f) => f.number);
  const overdueNumbers = recency
    .filter((r) => r.status === "overdue" || r.status === "never")
    .sort((a, b) => (b.drawsAgo ?? 999) - (a.drawsAgo ?? 999))
    .slice(0, 5)
    .map((r) => r.number);

  const latestDraw = sortedDraws[0];
  const ranges = config.ranges ?? [];
  const rangeTotals = new Map<string, number>();
  for (const range of ranges) {
    rangeTotals.set(range.label, 0);
  }

  for (const draw of sortedDraws) {
    for (const range of ranges) {
      const countInRange = draw.numbers.filter(
        (n) => n >= range.min && n <= range.max
      ).length;
      rangeTotals.set(range.label, (rangeTotals.get(range.label) ?? 0) + countInRange);
    }
  }

  const avgRangeDistribution: AvgRangeDistribution[] = ranges.map((range) => ({
    label: range.label,
    avgPerDraw:
      totalDraws > 0
        ? Math.round(((rangeTotals.get(range.label) ?? 0) / totalDraws) * 10) / 10
        : 0,
  }));

  const rangeDistribution: RangeDistribution[] = ranges.map((range) => {
    const numbersInRange =
      latestDraw?.numbers.filter((n) => n >= range.min && n <= range.max) ?? [];
    return {
      label: range.label,
      min: range.min,
      max: range.max,
      count: numbersInRange.length,
      numbers: numbersInRange,
    };
  });

  return {
    totalDraws,
    frequencies,
    recency,
    hotNumbers,
    coldNumbers,
    overdueNumbers,
    rangeDistribution,
    avgRangeDistribution,
  };
}

export function calculateMatches(
  predicted: number[],
  actual: number[]
): { matchedNumbers: number[]; matchCount: number } {
  const actualSet = new Set(actual);
  const matchedNumbers = predicted.filter((n) => actualSet.has(n)).sort((a, b) => a - b);
  return { matchedNumbers, matchCount: matchedNumbers.length };
}

export function buildAnalysisSummary(analysis: DrawAnalysis): string {
  const hot = analysis.hotNumbers.join(", ");
  const cold = analysis.coldNumbers.join(", ");
  const overdueDetail = analysis.recency
    .filter((r) => r.status === "overdue" || r.status === "never")
    .sort((a, b) => (b.drawsAgo ?? 999) - (a.drawsAgo ?? 999))
    .slice(0, 5)
    .map((r) =>
      r.drawsAgo === null ? `${r.number} (never)` : `${r.number} (${r.drawsAgo} draws)`
    )
    .join(", ");
  const frequencyDetail = [...analysis.frequencies]
    .sort((a, b) => a.number - b.number)
    .map((f) => `${f.number}:${f.frequency}`)
    .join(", ");
  const typicalBalance =
    analysis.avgRangeDistribution.length > 0
      ? analysis.avgRangeDistribution.map((r) => `${r.label}: ${r.avgPerDraw}`).join(", ")
      : "N/A";

  return [
    `Total draws analyzed: ${analysis.totalDraws}`,
    `Hot numbers (most frequent): ${hot}`,
    `Cold numbers (least frequent): ${cold}`,
    `Overdue numbers: ${overdueDetail || "none"}`,
    `Typical balance per draw — ${typicalBalance}`,
    `All frequencies (number:count): ${frequencyDetail}`,
  ].join("\n");
}

export function buildExtendedSummary(extended: ExtendedAnalysis): string {
  const topComposite = extended.composite
    .slice(0, 12)
    .map(
      (entry) =>
        `${entry.number} (score:${entry.score}, global:${entry.components.freqGlobal}, recent:${entry.components.freqRecent}, overdue:${entry.components.overdue}, day:${entry.components.dayAffinity})`
    )
    .join(", ");

  const windowLines = extended.windows.map((segment) => {
    const hot = segment.analysis.hotNumbers.join(", ") || "none";
    const cold = segment.analysis.coldNumbers.join(", ") || "none";
    const overdue = segment.analysis.overdueNumbers.join(", ") || "none";
    return `${segment.label} (${segment.totalDraws} draws) — Hot: ${hot}; Cold: ${cold}; Overdue: ${overdue}`;
  });

  const dayLines = extended.byDay.map((segment) => {
    const hot = segment.analysis.hotNumbers.join(", ") || "none";
    const cold = segment.analysis.coldNumbers.join(", ") || "none";
    return `${segment.label} (${segment.totalDraws} draws) — Hot: ${hot}; Cold: ${cold}`;
  });

  const globalSummary = buildAnalysisSummary(extended.global);

  return [
    "=== COMPOSITE SCORES (top 12, components 0-100) ===",
    topComposite || "none",
    "",
    "=== BY TIME WINDOW ===",
    ...windowLines,
    "",
    "=== BY DRAW DAY ===",
    ...dayLines,
    "",
    "=== GLOBAL SUMMARY ===",
    globalSummary,
  ].join("\n");
}

export function parseBulkDrawInput(
  text: string
): { date: string; numbers: number[] }[] {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const results: { date: string; numbers: number[] }[] = [];

  for (const line of lines) {
    // Format: YYYY-MM-DD 1,2,3,4,5,6,7
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2})[\s,;]+([\d,\s]+)$/
    );
    if (match) {
      const numbers = match[2]
        .split(/[,\s]+/)
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
      results.push({ date: match[1], numbers });
    }
  }

  return results;
}
