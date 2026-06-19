import { Suspense } from "react";
import { getDraws } from "@/lib/actions/draws";
import { analyzeDraws } from "@/lib/analysis";
import { GAMES, GAME_LIST } from "@/lib/games";
import { formatShortDate } from "@/lib/utils";
import { NumberBalls } from "@/components/number-grid";
import { Badge } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Game } from "@prisma/client";
import { DrawsFilter } from "./draws-filter";

export const dynamic = "force-dynamic";

async function DrawsContent({ gameFilter }: { gameFilter?: Game }) {
  const draws = await getDraws(gameFilter);

  const analysisByGame = GAME_LIST.map((g) => {
    const gameDraws = draws.filter((d) => d.game === g.id);
    const records = gameDraws.map((d) => ({
      date: formatShortDate(d.date),
      day: d.day,
      numbers: d.numbers,
    }));
    return {
      game: g.id,
      analysis: analyzeDraws(records, g.id),
    };
  });

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {analysisByGame
          .filter((a) => !gameFilter || a.game === gameFilter)
          .map(({ game, analysis }) => (
            <Card key={game}>
              <CardHeader>
                <CardTitle className="text-lg">{GAMES[game].name}</CardTitle>
                <CardDescription>
                  {analysis.totalDraws} tirage(s) en base
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-emerald-700">Chauds: </span>
                  {analysis.hotNumbers.join(", ") || "—"}
                </div>
                <div>
                  <span className="font-medium text-blue-700">Froids: </span>
                  {analysis.coldNumbers.join(", ") || "—"}
                </div>
                <div>
                  <span className="font-medium text-amber-700">En retard: </span>
                  {analysis.overdueNumbers.join(", ") || "—"}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résultats</CardTitle>
          <CardDescription>
            {draws.length} tirage(s)
            {gameFilter ? ` pour ${GAMES[gameFilter].name}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {draws.length === 0 ? (
            <p className="text-gray-500">
              Aucun tirage.{" "}
              <a href="/draws/import" className="text-emerald-600 hover:underline">
                Importer des résultats
              </a>
            </p>
          ) : (
            <div className="divide-y">
              {draws.map((draw) => (
                <div
                  key={draw.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{GAMES[draw.game].shortName}</Badge>
                      <span className="font-medium">
                        {formatShortDate(draw.date)}
                      </span>
                      <span className="text-sm text-gray-500">{draw.day}</span>
                    </div>
                  </div>
                  <NumberBalls numbers={draw.numbers} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default async function DrawsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const gameFilter = (params.game as Game) || undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tirages historiques</h1>
        <p className="mt-1 text-gray-600">
          Consultez les résultats passés et les statistiques
        </p>
      </div>

      <Suspense fallback={<div>Chargement du filtre...</div>}>
        <DrawsFilter currentGame={gameFilter} />
      </Suspense>

      <DrawsContent gameFilter={gameFilter} />
    </div>
  );
}
