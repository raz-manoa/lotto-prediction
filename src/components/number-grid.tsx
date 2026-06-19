"use client";

import { cn } from "@/lib/utils";
import { getGameConfig } from "@/lib/games";
import { Game } from "@prisma/client";

type NumberGridProps = {
  game: Game;
  selected: number[];
  onChange: (numbers: number[]) => void;
  disabled?: boolean;
};

export function NumberGrid({
  game,
  selected,
  onChange,
  disabled,
}: NumberGridProps) {
  const config = getGameConfig(game);
  const numbers = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => i + config.min
  );

  function toggle(num: number) {
    if (disabled) return;
    if (selected.includes(num)) {
      onChange(selected.filter((n) => n !== num));
    } else if (selected.length < config.count) {
      onChange([...selected, num].sort((a, b) => a - b));
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-gray-600">
        Sélectionnez {config.count} numéros ({selected.length}/{config.count})
      </p>
      <div
        className={cn(
          "grid gap-2",
          config.max <= 28 ? "grid-cols-7" : "grid-cols-8"
        )}
      >
        {numbers.map((num) => {
          const isSelected = selected.includes(num);
          const isFull = selected.length >= config.count && !isSelected;
          return (
            <button
              key={num}
              type="button"
              disabled={disabled || isFull}
              onClick={() => toggle(num)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
                isSelected
                  ? "bg-emerald-600 text-white shadow-md scale-105"
                  : isFull
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200"
              )}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NumberBalls({ numbers }: { numbers: number[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {numbers.map((n) => (
        <span
          key={n}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white sm:h-9 sm:w-9 sm:text-sm"
        >
          {n}
        </span>
      ))}
    </div>
  );
}
