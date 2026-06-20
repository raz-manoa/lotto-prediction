"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Game } from "@prisma/client";
import { GAME_LIST, getGameConfig, isValidDrawDate, formatDrawDays } from "@/lib/games";
import { NumberGrid } from "@/components/number-grid";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Select, Textarea } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  importDraw,
  importBulkDraws,
  importJsonDraws,
} from "@/lib/actions/draws";

type Tab = "form" | "bulk" | "json";

export default function ImportDrawsPage() {
  const [game, setGame] = useState<Game>("LOTO_VERT");
  const [tab, setTab] = useState<Tab>("form");
  const [date, setDate] = useState("");
  const [numbers, setNumbers] = useState<number[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      await importDraw(game, date, numbers);
      setMessage("Tirage importé avec succès");
      setNumbers([]);
      setDate("");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur"]);
    }
    setLoading(false);
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      const result = await importBulkDraws(game, bulkText);
      setMessage(`${result.imported} tirage(s) importé(s)`);
      setErrors(result.errors);
      if (result.imported > 0) setBulkText("");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur"]);
    }
    setLoading(false);
  }

  async function handleJsonSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrors([]);
    try {
      const result = await importJsonDraws(game, jsonText);
      setMessage(`${result.imported} tirage(s) importé(s)`);
      setErrors(result.errors);
      if (result.imported > 0) setJsonText("");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Erreur"]);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Importer des tirages</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Saisissez les anciens résultats manuellement ou en masse
        </p>
      </div>

      <div>
        <Select
          value={game}
          onChange={(e) => {
            const newGame = e.target.value as Game;
            setGame(newGame);
            setNumbers([]);
            if (date) {
              const drawDate = new Date(`${date}T12:00:00`);
              if (!isValidDrawDate(newGame, drawDate)) {
                setDate("");
              }
            }
          }}
          className="w-full sm:max-w-xs"
        >
          {GAME_LIST.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(["form", "bulk", "json"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-emerald-700 shadow-elevation-1"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "form" ? "Formulaire" : t === "bulk" ? "Collage en masse" : "JSON"}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          <ul className="list-disc pl-4">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === "form" && (
        <Card>
          <CardHeader>
            <CardTitle>Saisie unitaire</CardTitle>
            <CardDescription>
              Sélectionnez la date et les numéros sur la grille
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Date du tirage</Label>
                <p className="text-sm text-muted-foreground">
                  Jours de tirage : {formatDrawDays(getGameConfig(game).drawDays)}
                </p>
                <Calendar
                  mode="single"
                  selected={date ? new Date(`${date}T12:00:00`) : undefined}
                  onSelect={(selected) =>
                    setDate(selected ? format(selected, "yyyy-MM-dd") : "")
                  }
                  disabled={(day) => !isValidDrawDate(game, day)}
                  className="rounded-md shadow-elevation-1 w-fit"
                />
              </div>
              <NumberGrid
                game={game}
                selected={numbers}
                onChange={setNumbers}
              />
              <Button
                type="submit"
                disabled={loading || numbers.length === 0 || !date}
              >
                {loading ? "Import..." : "Importer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "bulk" && (
        <Card>
          <CardHeader>
            <CardTitle>Collage en masse</CardTitle>
            <CardDescription>
              Une ligne par tirage: YYYY-MM-DD 1,2,3,4,5,6,7
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                placeholder={`2025-12-05 1,2,8,14,16,21,22\n2025-12-02 6,10,13,14,17,23,27`}
              />
              <Button type="submit" disabled={loading || !bulkText.trim()}>
                {loading ? "Import..." : "Importer en masse"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "json" && (
        <Card>
          <CardHeader>
            <CardTitle>Import JSON</CardTitle>
            <CardDescription>
              Tableau JSON avec date et numbers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJsonSubmit} className="space-y-4">
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                placeholder={`[\n  {"date": "2025-12-05", "day": "Friday", "numbers": [1,2,8,14,16,21,22]}\n]`}
              />
              <Button type="submit" disabled={loading || !jsonText.trim()}>
                {loading ? "Import..." : "Importer JSON"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
