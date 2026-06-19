"use client";

import { useState } from "react";
import { Game } from "@prisma/client";
import { GAME_LIST } from "@/lib/games";
import { NumberBalls } from "@/components/number-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generatePredictionTickets,
  saveTickets,
} from "@/lib/actions/predictions";
import { LOTTERY_DISCLAIMER } from "@/lib/ai";

type TicketResult = {
  id: string;
  numbers: number[];
  explanation: string;
  saved: boolean;
};

type PredictionOutput = {
  predictionId: string;
  game: Game;
  model: string;
  rationale: string;
  tickets: TicketResult[];
  disclaimer: string;
};

export default function PredictPage() {
  const [game, setGame] = useState<Game>("LOTO_VERT");
  const [ticketCount, setTicketCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictionOutput | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [targetDate, setTargetDate] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setSelectedTickets(new Set());
    setSaveMessage("");

    try {
      const output = await generatePredictionTickets(game, ticketCount);
      setResult(output);
      setSelectedTickets(new Set(output.tickets.map((t) => t.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de génération");
    }
    setLoading(false);
  }

  function toggleTicket(id: string) {
    const next = new Set(selectedTickets);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTickets(next);
  }

  async function handleSave() {
    if (selectedTickets.size === 0) return;
    setSaveMessage("");
    try {
      await saveTickets([...selectedTickets], targetDate || undefined);
      setSaveMessage(`${selectedTickets.size} ticket(s) sauvegardé(s)`);
      if (result) {
        setResult({
          ...result,
          tickets: result.tickets.map((t) =>
            selectedTickets.has(t.id) ? { ...t, saved: true } : t
          ),
        });
      }
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Prédictions</h1>
        <p className="mt-1 text-gray-600">
          Générez des tickets basés sur l&apos;analyse historique et l&apos;IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle prédiction</CardTitle>
          <CardDescription>
            Configurez votre clé API dans{" "}
            <a href="/settings" className="text-emerald-600 hover:underline">
              Paramètres
            </a>{" "}
            avant de générer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Jeu</Label>
              <Select
                value={game}
                onChange={(e) => setGame(e.target.value as Game)}
                className="w-40"
              >
                {GAME_LIST.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre de tickets (1–10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={ticketCount}
                onChange={(e) => setTicketCount(parseInt(e.target.value, 10))}
                className="w-24"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Génération..." : "Générer"}
            </Button>
          </form>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la stratégie</CardTitle>
              <CardDescription>Modèle: {result.model}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">{result.rationale}</p>
              <p className="mt-4 text-xs text-gray-500 italic">
                {result.disclaimer || LOTTERY_DISCLAIMER}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {result.tickets.map((ticket, i) => (
              <Card key={ticket.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Game {i + 1}</span>
                        {ticket.saved && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            Sauvegardé
                          </span>
                        )}
                      </div>
                      <NumberBalls numbers={ticket.numbers} />
                      <p className="text-sm text-gray-600">{ticket.explanation}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => toggleTicket(ticket.id)}
                        className="rounded"
                      />
                      Sauvegarder
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Date de tirage cible (optionnel)</Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={selectedTickets.size === 0}
                >
                  Sauvegarder {selectedTickets.size} ticket(s)
                </Button>
              </div>
              {saveMessage && (
                <p className="mt-3 text-sm text-emerald-700">{saveMessage}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
