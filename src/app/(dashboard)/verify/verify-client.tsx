"use client";

import { useState } from "react";
import { Game } from "@prisma/client";
import { GAMES, GAME_LIST } from "@/lib/games";
import { NumberBalls } from "@/components/number-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/select";
import { verifyTicketsAgainstDraw } from "@/lib/actions/predictions";

type DrawOption = {
  id: string;
  game: Game;
  date: string;
  day: string;
  numbers: number[];
};

type VerifyResult = Awaited<ReturnType<typeof verifyTicketsAgainstDraw>>;

export function VerifyClient({ draws }: { draws: DrawOption[] }) {
  const [gameFilter, setGameFilter] = useState<Game | "">("");
  const [selectedDrawId, setSelectedDrawId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");

  const filteredDraws = gameFilter
    ? draws.filter((d) => d.game === gameFilter)
    : draws;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDrawId) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const output = await verifyTicketsAgainstDraw(selectedDrawId);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Vérifier les tickets</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Comparez vos tickets sauvegardés avec un tirage réel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un tirage</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <Label>Filtrer par jeu</Label>
              <Select
                value={gameFilter}
                onChange={(e) => {
                  setGameFilter(e.target.value as Game | "");
                  setSelectedDrawId("");
                }}
                className="w-full sm:w-44"
              >
                <option value="">Tous</option>
                {GAME_LIST.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tirage</Label>
              <Select
                value={selectedDrawId}
                onChange={(e) => setSelectedDrawId(e.target.value)}
                className="w-full sm:w-64"
                required
              >
                <option value="">Choisir un tirage...</option>
                {filteredDraws.map((d) => (
                  <option key={d.id} value={d.id}>
                    {GAMES[d.game].shortName} — {d.date} ({d.day})
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={loading || !selectedDrawId} className="w-full sm:w-auto">
              {loading ? "Vérification..." : "Vérifier"}
            </Button>
          </form>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Résultat du tirage</CardTitle>
              <CardDescription>
                {GAMES[result.draw.game as Game].name} — {result.draw.date}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NumberBalls numbers={result.draw.numbers} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{result.summary.message}</p>
              <p>Tickets vérifiés: {result.summary.totalTickets}</p>
              <p>Meilleur match: {result.summary.bestMatch} numéro(s)</p>
              {result.summary.winningTickets > 0 && (
                <p className="font-medium text-emerald-700">
                  {result.summary.winningTickets} ticket(s) avec palier de gain
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            {result.results.map((r, i) => (
              <Card key={r.ticketId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div>
                    <span className="font-medium">Ticket {i + 1}</span>
                    <div className="mt-2">
                      <NumberBalls numbers={r.numbers} />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>{r.matchCount} correspondance(s)</p>
                    {r.tier && <Badge variant="success">{r.tier}</Badge>}
                    {r.matchedNumbers.length > 0 && (
                      <p className="mt-1 text-gray-500">
                        Match: {r.matchedNumbers.join(", ")}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
