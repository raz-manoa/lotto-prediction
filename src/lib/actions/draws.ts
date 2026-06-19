"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Game } from "@prisma/client";
import {
  validateNumbers,
  getDayFromDate,
  deduplicateLotoFamilyDraws,
  type DrawFilter,
} from "@/lib/games";
import { parseBulkDrawInput } from "@/lib/analysis";
import { revalidatePath } from "next/cache";

export type DrawStatGroup = {
  id: DrawFilter;
  draws: Awaited<ReturnType<typeof prisma.draw.findMany>>;
};

export async function getDrawsForPage(filter?: DrawFilter) {
  const all = await prisma.draw.findMany({ orderBy: { date: "desc" } });

  const lotoVertDraws = all.filter((d) => d.game === "LOTO_VERT");
  const lotoFamilyDraws = deduplicateLotoFamilyDraws(
    all.filter((d) => d.game === "LOTO" || d.game === "LOTO_PLUS")
  );

  let draws: typeof all;
  let statGroups: DrawStatGroup[];

  if (filter === "LOTO_VERT") {
    draws = lotoVertDraws;
    statGroups = [{ id: "LOTO_VERT", draws: lotoVertDraws }];
  } else if (filter === "LOTO_FAMILY") {
    draws = lotoFamilyDraws;
    statGroups = [{ id: "LOTO_FAMILY", draws: lotoFamilyDraws }];
  } else {
    draws = [...lotoVertDraws, ...lotoFamilyDraws].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    statGroups = [
      { id: "LOTO_VERT", draws: lotoVertDraws },
      { id: "LOTO_FAMILY", draws: lotoFamilyDraws },
    ];
  }

  return { draws, statGroups };
}

export async function getDraws(game?: Game) {
  if (!game) {
    const { draws } = await getDrawsForPage();
    return draws;
  }

  if (game === "LOTO" || game === "LOTO_PLUS") {
    const draws = await prisma.draw.findMany({
      where: { game: { in: ["LOTO", "LOTO_PLUS"] } },
      orderBy: { date: "desc" },
    });
    return deduplicateLotoFamilyDraws(draws);
  }

  return prisma.draw.findMany({
    where: { game },
    orderBy: { date: "desc" },
  });
}

export async function importDraw(
  game: Game,
  date: string,
  numbers: number[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const validation = validateNumbers(numbers, game);
  if (!validation.valid) throw new Error(validation.error);

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

  revalidatePath("/draws");
  revalidatePath("/draws/import");
  return { success: true };
}

export async function importBulkDraws(
  game: Game,
  text: string
): Promise<{ imported: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const entries = parseBulkDrawInput(text);
  const errors: string[] = [];
  let imported = 0;

  for (const entry of entries) {
    const validation = validateNumbers(entry.numbers, game);
    if (!validation.valid) {
      errors.push(`${entry.date}: ${validation.error}`);
      continue;
    }

    try {
      await importDraw(game, entry.date, entry.numbers);
      imported++;
    } catch (e) {
      errors.push(`${entry.date}: ${e instanceof Error ? e.message : "Erreur"}`);
    }
  }

  return { imported, errors };
}

export async function importJsonDraws(
  game: Game,
  jsonText: string
): Promise<{ imported: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  let data: { date: string; day?: string; numbers: number[] }[];
  try {
    data = JSON.parse(jsonText);
    if (!Array.isArray(data)) throw new Error("JSON must be an array");
  } catch {
    throw new Error("JSON invalide");
  }

  const errors: string[] = [];
  let imported = 0;

  for (const entry of data) {
    const validation = validateNumbers(entry.numbers, game);
    if (!validation.valid) {
      errors.push(`${entry.date}: ${validation.error}`);
      continue;
    }

    try {
      await importDraw(game, entry.date, entry.numbers);
      imported++;
    } catch (e) {
      errors.push(`${entry.date}: ${e instanceof Error ? e.message : "Erreur"}`);
    }
  }

  return { imported, errors };
}

export async function deleteDraw(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.draw.delete({ where: { id } });
  revalidatePath("/draws");
}
