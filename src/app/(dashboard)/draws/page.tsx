import { getDrawsForPage } from "@/lib/actions/draws";
import { analyzeDraws } from "@/lib/analysis";
import {
  DRAW_FILTER_OPTIONS,
  getDrawFilterLabel,
  getDrawGroupLabel,
  parseDrawFilter,
  type DrawFilter,
} from "@/lib/games";
import { formatShortDate } from "@/lib/utils";
import { NumberBalls } from "@/components/number-grid";
import { Badge } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DrawsFilter } from "./draws-filter";
import { Game } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

const STAT_GROUP_META: Record<
  DrawFilter,
  { title: string; analysisGame: Game }
> = {
  LOTO_VERT: { title: "Loto Vert", analysisGame: "LOTO_VERT" },
  LOTO: { title: "Loto", analysisGame: "LOTO" },
  LOTO_PLUS: { title: "Loto+", analysisGame: "LOTO_PLUS" },
};

async function DrawsContent({
  gameFilter,
  page,
  selectedDate,
}: {
  gameFilter?: DrawFilter;
  page: number;
  selectedDate?: string;
}) {
  const { draws: allDraws, statGroups } = await getDrawsForPage(gameFilter);

  const availableDates = [
    ...new Set(allDraws.map((d) => formatShortDate(d.date))),
  ].sort((a, b) => b.localeCompare(a));

  const validSelectedDate =
    selectedDate && availableDates.includes(selectedDate)
      ? selectedDate
      : undefined;

  const draws = validSelectedDate
    ? allDraws.filter((d) => formatShortDate(d.date) === validSelectedDate)
    : allDraws;

  const analysisCards = statGroups.map((group) => {
    const records = group.draws.map((d) => ({
      date: formatShortDate(d.date),
      day: d.day,
      numbers: d.numbers,
    }));
    const meta = STAT_GROUP_META[group.id];
    return {
      id: group.id,
      title: meta.title,
      description:
        DRAW_FILTER_OPTIONS.find((o) => o.value === group.id)?.description ?? "",
      analysis: analyzeDraws(records, meta.analysisGame),
    };
  });

  const totalDraws = draws.length;
  const totalPages = Math.max(1, Math.ceil(totalDraws / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedDraws = draws.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (gameFilter) params.set("game", gameFilter);
    if (validSelectedDate) params.set("date", validSelectedDate);
    params.set("page", String(p));
    return `/draws?${params.toString()}`;
  }

  return (
    <>
      <DrawsFilter
        currentFilter={gameFilter}
        availableDates={availableDates}
        selectedDate={validSelectedDate}
      />

      <div
        className={`grid gap-4 ${
          analysisCards.length > 1
            ? "sm:grid-cols-2 lg:grid-cols-3"
            : "max-w-md"
        }`}
      >
        {analysisCards.map(({ id, title, description, analysis }) => (
          <Card key={id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                {description} · {analysis.totalDraws} tirage(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-emerald-700">Chauds:</span>
                {analysis.hotNumbers.length > 0 ? (
                  analysis.hotNumbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800"
                    >
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-blue-700">Froids:</span>
                {analysis.coldNumbers.length > 0 ? (
                  analysis.coldNumbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800"
                    >
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-amber-700">En retard:</span>
                {analysis.overdueNumbers.length > 0 ? (
                  analysis.overdueNumbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800"
                    >
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Résultats</CardTitle>
          <CardDescription>
            {totalDraws} tirage(s)
            {gameFilter ? ` pour ${getDrawFilterLabel(gameFilter)}` : ""}
            {validSelectedDate ? ` · ${validSelectedDate}` : ""}
            {totalPages > 1 && ` · Page ${safePage}/${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {draws.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="rounded-full bg-gray-100 p-4">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-700">
                  Aucun tirage enregistré
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  <a
                    href="/draws/import"
                    className="text-emerald-600 hover:underline"
                  >
                    Importer des résultats
                  </a>{" "}
                  pour commencer l&apos;analyse.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {paginatedDraws.map((draw) => (
                  <div
                    key={draw.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getDrawGroupLabel(draw.game)}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatShortDate(draw.date)}
                      </span>
                      <span className="text-xs text-gray-500">{draw.day}</span>
                    </div>
                    <NumberBalls numbers={draw.numbers} />
                  </div>
                ))}
              </div>
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                buildHref={buildHref}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default async function DrawsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; page?: string; date?: string }>;
}) {
  const params = await searchParams;
  const gameFilter = parseDrawFilter(params.game);
  const page = parseInt(params.page ?? "1", 10) || 1;
  const selectedDate = params.date;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Tirages historiques
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Consultez les résultats passés et les statistiques
        </p>
      </div>

      <DrawsContent
        gameFilter={gameFilter}
        page={page}
        selectedDate={selectedDate}
      />
    </div>
  );
}
