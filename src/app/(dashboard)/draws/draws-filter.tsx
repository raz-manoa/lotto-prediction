"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { DRAW_FILTER_OPTIONS, parseDrawFilter, type DrawFilter } from "@/lib/games";

export function DrawsFilter({ currentFilter }: { currentFilter?: DrawFilter }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("game", e.target.value);
    } else {
      params.delete("game");
    }
    params.delete("page");
    router.push(`/draws?${params.toString()}`);
  }

  return (
    <Select
      value={currentFilter ?? ""}
      onChange={handleChange}
      className="w-full sm:max-w-xs"
    >
      <option value="">Tous les jeux</option>
      {DRAW_FILTER_OPTIONS.map((g) => (
        <option key={g.value} value={g.value}>
          {g.label}
        </option>
      ))}
    </Select>
  );
}

/** Normalise l'ancien param game=LOTO ou LOTO_PLUS vers LOTO_FAMILY */
export function normalizeDrawFilterFromParams(
  game?: string
): DrawFilter | undefined {
  return parseDrawFilter(game);
}
