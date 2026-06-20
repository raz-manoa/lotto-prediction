"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DRAW_FILTER_OPTIONS,
  getGameColors,
  type DrawFilter,
} from "@/lib/games";

type AnalysisGameFilterProps = {
  currentFilter: DrawFilter;
};

export function AnalysisGameFilter({ currentFilter }: AnalysisGameFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleGameChange(game: DrawFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("game", game);
    router.push(`/analysis?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DRAW_FILTER_OPTIONS.map((option) => {
        const colors = getGameColors(option.value);
        const isActive = currentFilter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleGameChange(option.value)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
              isActive ? colors.chipActive : colors.chipInactive
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
