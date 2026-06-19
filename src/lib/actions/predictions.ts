"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Game } from "@prisma/client";
import { generatePredictions, LOTTERY_DISCLAIMER } from "@/lib/ai";
import { getDefaultAiConfig, getDecryptedApiKey } from "./settings";
import { getDraws } from "./draws";
import { revalidatePath } from "next/cache";
import { calculateMatches } from "@/lib/analysis";
import { getTierLabel } from "@/lib/games";
import { formatShortDate } from "@/lib/utils";

export async function generatePredictionTickets(
  game: Game,
  ticketCount: number
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const aiConfig = await getDefaultAiConfig();
  if (!aiConfig) {
    throw new Error(
      "Aucune configuration IA trouvée. Configurez votre clé API dans Paramètres."
    );
  }

  const apiKey = await getDecryptedApiKey(aiConfig.id);
  if (!apiKey) {
    throw new Error("Clé API invalide. Mettez à jour votre configuration.");
  }

  const draws = await getDraws(game);
  const drawRecords = draws.map((d) => ({
    date: formatShortDate(d.date),
    day: d.day,
    numbers: d.numbers,
  }));

  const result = await generatePredictions(game, ticketCount, drawRecords, {
    provider: "ANTHROPIC",
    model: aiConfig.model,
    apiKey,
    maxTokens: aiConfig.maxTokens,
    temperature: aiConfig.temperature,
  });

  const prediction = await prisma.prediction.create({
    data: {
      userId: session.user.id,
      game,
      model: aiConfig.model,
      rationale: result.rationale,
      tickets: {
        create: result.tickets.map((t) => ({
          numbers: t.numbers,
          explanation: t.explanation,
          saved: false,
        })),
      },
    },
    include: { tickets: true },
  });

  revalidatePath("/predict");
  revalidatePath("/tickets");

  return {
    predictionId: prediction.id,
    game: prediction.game,
    model: prediction.model,
    rationale: prediction.rationale,
    tickets: prediction.tickets.map((t) => ({
      id: t.id,
      numbers: t.numbers,
      explanation: t.explanation,
      saved: t.saved,
    })),
    disclaimer: LOTTERY_DISCLAIMER,
  };
}

export async function saveTickets(
  ticketIds: string[],
  targetDrawDate?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const tickets = await prisma.predictionTicket.findMany({
    where: { id: { in: ticketIds } },
    include: { prediction: true },
  });

  const owned = tickets.filter((t) => t.prediction.userId === session.user!.id);
  if (owned.length !== ticketIds.length) {
    throw new Error("Tickets non autorisés");
  }

  await prisma.predictionTicket.updateMany({
    where: { id: { in: ticketIds } },
    data: {
      saved: true,
      ...(targetDrawDate && {
        targetDrawDate: new Date(targetDrawDate + "T12:00:00"),
      }),
    },
  });

  revalidatePath("/tickets");
  return { saved: ticketIds.length };
}

export async function getSavedTickets(game?: Game) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  return prisma.predictionTicket.findMany({
    where: {
      saved: true,
      prediction: {
        userId: session.user.id,
        ...(game ? { game } : {}),
      },
    },
    include: {
      prediction: { select: { game: true, model: true, createdAt: true } },
      results: { include: { draw: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPredictions() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  return prisma.prediction.findMany({
    where: { userId: session.user.id },
    include: { tickets: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function verifyTicketsAgainstDraw(drawId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const draw = await prisma.draw.findUnique({ where: { id: drawId } });
  if (!draw) throw new Error("Tirage introuvable");

  const tickets = await prisma.predictionTicket.findMany({
    where: {
      saved: true,
      prediction: { userId: session.user.id, game: draw.game },
    },
    include: { prediction: true },
  });

  const results = [];

  for (const ticket of tickets) {
    const { matchedNumbers, matchCount } = calculateMatches(
      ticket.numbers,
      draw.numbers
    );
    const tier = getTierLabel(draw.game, matchCount);

    const result = await prisma.ticketResult.upsert({
      where: {
        ticketId_drawId: { ticketId: ticket.id, drawId: draw.id },
      },
      update: { matchedNumbers, matchCount, tier },
      create: {
        ticketId: ticket.id,
        drawId: draw.id,
        matchedNumbers,
        matchCount,
        tier,
      },
    });

    results.push({
      ticketId: ticket.id,
      numbers: ticket.numbers,
      matchedNumbers,
      matchCount,
      tier,
      resultId: result.id,
    });
  }

  revalidatePath("/verify");
  revalidatePath("/tickets");

  const bestMatch = Math.max(...results.map((r) => r.matchCount), 0);
  const winners = results.filter((r) => r.tier);

  return {
    draw: {
      id: draw.id,
      game: draw.game,
      date: formatShortDate(draw.date),
      numbers: draw.numbers,
    },
    results,
    summary: {
      totalTickets: results.length,
      bestMatch,
      winningTickets: winners.length,
      message:
        winners.length > 0
          ? `${winners.length} ticket(s) avec un palier de gain (${winners.map((w) => w.tier).join(", ")})`
          : bestMatch > 0
            ? `Meilleur résultat: ${bestMatch} numéro(s) correspondant(s), aucun palier de gain`
            : "Aucune correspondance sur vos tickets sauvegardés",
    },
  };
}

export async function unsaveTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const ticket = await prisma.predictionTicket.findFirst({
    where: { id: ticketId },
    include: { prediction: true },
  });

  if (!ticket || ticket.prediction.userId !== session.user.id) {
    throw new Error("Ticket introuvable");
  }

  await prisma.predictionTicket.update({
    where: { id: ticketId },
    data: { saved: false, targetDrawDate: null },
  });

  revalidatePath("/tickets");
}
