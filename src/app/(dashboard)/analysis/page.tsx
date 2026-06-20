import { getDraws } from "@/lib/actions/draws";
import {
  analyzeExtended,
  type CompositeScore,
  type DrawAnalysis,
  type SegmentAnalysis,
} from "@/lib/analysis";
import {
  DRAW_FILTER_OPTIONS,
  getGameColors,
  normalizeAnalysisGame,
  type DrawFilter,
} from "@/lib/games";
import { cn, formatShortDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisGameFilter } from "./analysis-game-filter";
import { Game } from "@prisma/client";

export const dynamic = "force-dynamic";

function NumberBadges({
  numbers,
  variant,
}: {
  numbers: number[];
  variant: "hot" | "cold" | "overdue";
}) {
  const styles = {
    hot: "bg-emerald-100 text-emerald-800",
    cold: "bg-blue-100 text-blue-800",
    overdue: "bg-amber-100 text-amber-800",
  };

  if (numbers.length === 0) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <>
      {numbers.map((n) => (
        <span
          key={n}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
            styles[variant]
          )}
        >
          {n}
        </span>
      ))}
    </>
  );
}

function StatSection({
  title,
  numbers,
  variant,
  description,
}: {
  title: string;
  numbers: number[];
  variant: "hot" | "cold" | "overdue";
  description: string;
}) {
  const titleColors = {
    hot: "text-emerald-700",
    cold: "text-blue-700",
    overdue: "text-amber-700",
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("font-medium", titleColors[variant])}>{title}:</span>
        <NumberBadges numbers={numbers} variant={variant} />
      </div>
      <p className="text-xs leading-snug text-gray-500">{description}</p>
    </div>
  );
}

function AnalysisStatCard({
  title,
  description,
  analysis,
  accentClass,
}: {
  title: string;
  description: string;
  analysis: DrawAnalysis;
  accentClass: string;
}) {
  return (
    <Card className={cn("border-l-4", accentClass)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {description} · {analysis.totalDraws} tirage(s)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <StatSection
          title="Chauds"
          numbers={analysis.hotNumbers}
          variant="hot"
          description="Numéros les plus fréquents sur cette période."
        />
        <StatSection
          title="Froids"
          numbers={analysis.coldNumbers}
          variant="cold"
          description="Numéros les moins fréquents sur cette période."
        />
        <StatSection
          title="En retard"
          numbers={analysis.overdueNumbers}
          variant="overdue"
          description="Numéros absents depuis longtemps (8 tirages ou plus)."
        />
      </CardContent>
    </Card>
  );
}

function CompositeScoreRow({ entry }: { entry: CompositeScore }) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-800">
            {entry.number}
          </span>
          <span className="text-sm font-medium text-gray-700">
            Score {entry.score}/100
          </span>
        </div>
        <div className="h-2 flex-1 max-w-48 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${entry.score}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
        <span>Global {entry.components.freqGlobal}</span>
        <span>Récent {entry.components.freqRecent}</span>
        <span>Retard {entry.components.overdue}</span>
        <span>Jour {entry.components.dayAffinity}</span>
      </div>
    </div>
  );
}

async function AnalysisContent({ game }: { game: DrawFilter }) {
  const draws = await getDraws(game);
  const records = draws.map((draw) => ({
    date: formatShortDate(draw.date),
    day: draw.day,
    numbers: draw.numbers,
  }));

  const extended = analyzeExtended(records, game as Game);
  const gameMeta = DRAW_FILTER_OPTIONS.find((option) => option.value === game);
  const colors = getGameColors(game);
  const topComposite = extended.composite.slice(0, 12);

  if (draws.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="font-medium text-gray-700">Aucun tirage enregistré</p>
          <p className="mt-1 text-sm text-gray-500">
            <a href="/draws/import" className="text-emerald-600 hover:underline">
              Importer des résultats
            </a>{" "}
            pour lancer l&apos;analyse.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className={cn("border-l-4", colors.accent)}>
        <CardHeader>
          <CardTitle>Score composite</CardTitle>
          <CardDescription>
            {gameMeta?.description} · Synthèse pondérée (fréquence globale,
            tendance récente, retard, affinité jour de tirage)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topComposite.map((entry) => (
            <CompositeScoreRow key={entry.number} entry={entry} />
          ))}
          <p className="border-t pt-3 text-xs text-gray-500">
            Les composantes (0–100) indiquent la contribution de chaque signal.
            Un score élevé ne garantit pas un gain.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Par fenêtre</h2>
          <p className="text-sm text-gray-600">
            Analyse relative au dernier tirage enregistré
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {extended.windows.map((segment: SegmentAnalysis) => (
            <AnalysisStatCard
              key={segment.key}
              title={segment.label}
              description={gameMeta?.label ?? game}
              analysis={segment.analysis}
              accentClass={colors.accent}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Par jour de tirage
          </h2>
          <p className="text-sm text-gray-600">
            Fréquences selon le jour de la semaine du tirage
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {extended.byDay.map((segment: SegmentAnalysis) => (
            <AnalysisStatCard
              key={segment.key}
              title={segment.label}
              description={gameMeta?.label ?? game}
              analysis={segment.analysis}
              accentClass={colors.accent}
            />
          ))}
        </div>
      </section>

      <p className="text-xs italic text-gray-400">
        Indicateurs purement statistiques : chaque tirage reste aléatoire et
        indépendant.
      </p>
    </div>
  );
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const params = await searchParams;
  const game = normalizeAnalysisGame(params.game);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Analyse</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Statistiques avancées par période, jour de tirage et score composite
        </p>
      </div>

      <AnalysisGameFilter currentFilter={game} />

      <AnalysisContent game={game} />
    </div>
  );
}
