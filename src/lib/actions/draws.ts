"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Game } from "@prisma/client";
import { validateNumbers, getDayFromDate } from "@/lib/games";
import { parseBulkDrawInput } from "@/lib/analysis";
import { revalidatePath } from "next/cache";

export async function getDraws(game?: Game) {
  return prisma.draw.findMany({
    where: game ? { game } : undefined,
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
