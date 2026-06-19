import { PrismaClient, Game } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type HistoryEntry = {
  date: string;
  day: string;
  numbers: number[];
};

async function main() {
  const historyPath = path.join(process.cwd(), "data", "history.json");

  if (fs.existsSync(historyPath)) {
    const history: HistoryEntry[] = JSON.parse(
      fs.readFileSync(historyPath, "utf-8")
    );

    for (const entry of history) {
      await prisma.draw.upsert({
        where: {
          game_date: {
            game: Game.LOTO_VERT,
            date: new Date(entry.date + "T12:00:00"),
          },
        },
        update: {
          day: entry.day,
          numbers: entry.numbers,
        },
        create: {
          game: Game.LOTO_VERT,
          date: new Date(entry.date + "T12:00:00"),
          day: entry.day,
          numbers: entry.numbers,
        },
      });
    }

    console.log(`Seeded ${history.length} Loto Vert draws from history.json`);
  } else {
    console.log("No history.json found, skipping draw seed");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
