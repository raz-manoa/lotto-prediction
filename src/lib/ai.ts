import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { Game } from "@prisma/client";
import { z } from "zod";
import { analyzeDraws, buildAnalysisSummary, type DrawRecord } from "./analysis";
import {
  getGameConfig,
  RETIRED_ANTHROPIC_MODELS,
  validateNumbers,
} from "./games";
import { sortNumbers, numbersKey } from "./utils";

export type AiConfigInput = {
  provider: "ANTHROPIC";
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
};

export type GeneratedTicket = {
  numbers: number[];
  explanation: string;
};

export type PredictionResult = {
  tickets: GeneratedTicket[];
  rationale: string;
  source: "ai" | "heuristic";
  warning?: string;
};

function getAiErrorMessage(error: unknown, model?: string): string {
  const message = error instanceof Error ? error.message : String(error);
  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  const responseBody =
    error && typeof error === "object" && "responseBody" in error
      ? String(error.responseBody)
      : "";

  if (/credit balance|insufficient.*credit|billing/i.test(message)) {
    return "Crédits Anthropic insuffisants. Rechargez votre compte sur console.anthropic.com ou utilisez une autre clé API.";
  }
  if (/invalid.*api.*key|authentication|401/i.test(message)) {
    return "Clé API Anthropic invalide. Vérifiez votre configuration dans Paramètres.";
  }
  if (/rate limit|429/i.test(message)) {
    return "Limite de requêtes Anthropic atteinte. Réessayez dans quelques minutes.";
  }
  if (
    statusCode === 404 ||
    /not_found_error|model.*not.*found/i.test(message + responseBody)
  ) {
    const replacement = model ? RETIRED_ANTHROPIC_MODELS[model] : undefined;
    if (replacement) {
      return `Le modèle ${model} n'est plus disponible. Mettez à jour vers ${replacement} dans Paramètres.`;
    }
    return "Modèle Claude introuvable ou retiré. Choisissez un modèle actuel dans Paramètres.";
  }

  return "L'API Claude est indisponible. Tickets générés par analyse heuristique locale.";
}

function resolveAnthropicModel(model: string): string {
  return RETIRED_ANTHROPIC_MODELS[model] ?? model;
}

function buildPrompt(
  game: Game,
  ticketCount: number,
  draws: DrawRecord[]
): string {
  const config = getGameConfig(game);
  const analysis = analyzeDraws(draws, game);
  const summary = buildAnalysisSummary(analysis);
  const recentDraws = draws
    .slice(0, 10)
    .map(
      (d) =>
        `${d.date}: [${sortNumbers(d.numbers).join(", ")}]`
    )
    .join("\n");

  return `You are a lottery analysis assistant for ${config.name} in Mauritius.

GAME RULES:
- Pick exactly ${config.count} distinct numbers from ${config.min} to ${config.max}
- Draws on: ${config.drawDays.join(" and ")}

HISTORICAL ANALYSIS:
${summary}

RECENT DRAWS (newest first):
${recentDraws || "No historical data available."}

TASK:
Generate exactly ${ticketCount} unique lottery tickets based on statistical heuristics:
- Mix hot (frequent) numbers with cold/overdue numbers
- Balance across low/mid/high ranges using the typical balance per draw shown above
- Ensure diversity across tickets (no two identical tickets)
- Each ticket needs a short explanation (1-2 sentences) in French

IMPORTANT:
- This is heuristic only, not a guaranteed winning strategy
- All numbers must be distinct within each ticket
- Numbers must be integers in range [${config.min}, ${config.max}]`;
}

function createTicketSchema(game: Game, count: number) {
  const config = getGameConfig(game);
  return z.object({
    tickets: z
      .array(
        z.object({
          numbers: z
            .array(z.number().int())
            .length(config.count)
            .describe(`${config.count} distinct numbers from ${config.min} to ${config.max}`),
          explanation: z.string().describe("Short French explanation for this ticket"),
        })
      )
      .length(count),
    rationale: z
      .string()
      .describe("Overall summary in French explaining the strategy used across all tickets"),
  });
}

function sanitizeTickets(
  raw: GeneratedTicket[],
  game: Game
): GeneratedTicket[] {
  const config = getGameConfig(game);
  const seen = new Set<string>();
  const valid: GeneratedTicket[] = [];

  for (const ticket of raw) {
    const numbers = sortNumbers([...new Set(ticket.numbers)]);
    const validation = validateNumbers(numbers, game);
    if (!validation.valid) continue;

    const key = numbersKey(numbers);
    if (seen.has(key)) continue;
    seen.add(key);

    valid.push({
      numbers,
      explanation: ticket.explanation || `Ticket basé sur l'analyse des ${config.name}.`,
    });
  }

  return valid;
}

function generateFallbackTickets(
  game: Game,
  count: number,
  draws: DrawRecord[]
): PredictionResult {
  const config = getGameConfig(game);
  const analysis = analyzeDraws(draws, game);
  const pool = [
    ...analysis.hotNumbers,
    ...analysis.overdueNumbers,
    ...analysis.coldNumbers.slice(0, 3),
  ];
  const allNumbers = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => i + config.min
  );

  const tickets: GeneratedTicket[] = [];
  const usedKeys = new Set<string>();

  while (tickets.length < count) {
    const selected = new Set<number>();
    const shuffled = [...allNumbers].sort(() => Math.random() - 0.5);

    for (const n of pool) {
      if (selected.size >= config.count) break;
      if (!selected.has(n)) selected.add(n);
    }
    for (const n of shuffled) {
      if (selected.size >= config.count) break;
      if (!selected.has(n)) selected.add(n);
    }

    const numbers = sortNumbers([...selected]);
    const key = numbersKey(numbers);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    tickets.push({
      numbers,
      explanation: `Mélange de numéros chauds (${analysis.hotNumbers.slice(0, 2).join(", ")}) et en retard.`,
    });
  }

  return {
    tickets,
    rationale:
      "Tickets générés par heuristique locale (fréquence et récence) — analyse statistique sans IA.",
    source: "heuristic",
  };
}

export async function generatePredictions(
  game: Game,
  ticketCount: number,
  draws: DrawRecord[],
  aiConfig: AiConfigInput
): Promise<PredictionResult> {
  const config = getGameConfig(game);
  const prompt = buildPrompt(game, ticketCount, draws);
  const schema = createTicketSchema(game, ticketCount);

  const anthropic = createAnthropic({ apiKey: aiConfig.apiKey });
  const modelId = resolveAnthropicModel(aiConfig.model);

  try {
    const { object } = await generateObject({
      model: anthropic(modelId),
      schema,
      prompt,
      maxTokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
    });

    const sanitized = sanitizeTickets(object.tickets, game);

    if (sanitized.length < ticketCount) {
      const fallback = generateFallbackTickets(
        game,
        ticketCount - sanitized.length,
        draws
      );
      return {
        tickets: [...sanitized, ...fallback.tickets].slice(0, ticketCount),
        rationale: object.rationale,
        source: "ai",
      };
    }

    return {
      tickets: sanitized.slice(0, ticketCount),
      rationale: object.rationale,
      source: "ai",
    };
  } catch (error) {
    const warning = getAiErrorMessage(error, aiConfig.model);
    console.warn(
      "AI generation failed, using heuristic fallback:",
      warning,
      error instanceof Error ? error.message : error
    );
    const fallback = generateFallbackTickets(game, ticketCount, draws);
    return { ...fallback, warning };
  }
}

export const LOTTERY_DISCLAIMER =
  "Les résultats de loterie sont fondamentalement aléatoires. Ces tickets sont des suggestions heuristiques basées sur les données passées et ne garantissent aucun gain.";
