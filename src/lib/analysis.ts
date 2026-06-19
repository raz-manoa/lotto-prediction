import { Game } from "@prisma/client";
import { getGameConfig } from "./games";

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

function parseDrawDate(date: string): Date {
  return new Date(date + "T12:00:00");
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
