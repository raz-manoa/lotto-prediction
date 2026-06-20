"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DRAW_FILTER_OPTIONS,
  getGameColors,
  parseDrawFilter,
  type DrawFilter,
} from "@/lib/games";

type DrawsFilterProps = {
  currentFilter?: DrawFilter;
  availableDates: string[];
  selectedDate?: string;
};

export function DrawsFilter({
  currentFilter,
  availableDates,
  selectedDate,
}: DrawsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const defaultMonth = selectedDate
    ? parseISO(`${selectedDate}T12:00:00`)
    : availableDates[0]
      ? parseISO(`${availableDates[0]}T12:00:00`)
      : new Date();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function navigate(nextParams: URLSearchParams) {
    const query = nextParams.toString();
    router.push(query ? `/draws?${query}` : "/draws");
  }

  function handleGameChange(game?: DrawFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (game) {
      params.set("game", game);
    } else {
      params.delete("game");
    }
    params.delete("page");
    params.delete("date");
    navigate(params);
  }

  function handleDateSelect(date: Date | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", format(date, "yyyy-MM-dd"));
    } else {
      params.delete("date");
    }
    params.delete("page");
    navigate(params);
    setOpen(false);
  }

  function handleClearDate() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    params.delete("page");
    navigate(params);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleGameChange(undefined)}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
            !currentFilter
              ? "bg-gray-700 text-white"
              : "text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
          )}
        >
          Tous
        </button>
        {DRAW_FILTER_OPTIONS.map((g) => {
          const colors = getGameColors(g.value);
          const isActive = currentFilter === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => handleGameChange(g.value)}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                isActive ? colors.chipActive : colors.chipInactive
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <div ref={containerRef} className="relative w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "w-full justify-start text-left font-normal sm:w-[240px]",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selectedDate
            ? format(parseISO(`${selectedDate}T12:00:00`), "d MMMM yyyy", {
                locale: fr,
              })
            : "Filtrer par date"}
        </Button>

        {open && (
          <div className="absolute left-0 z-50 mt-2 rounded-md bg-background p-0 shadow-elevation-3">
            <Calendar
              mode="single"
              selected={
                selectedDate
                  ? parseISO(`${selectedDate}T12:00:00`)
                  : undefined
              }
              onSelect={handleDateSelect}
              disabled={(day) =>
                !availableDateSet.has(format(day, "yyyy-MM-dd"))
              }
              defaultMonth={defaultMonth}
              className="rounded-md"
            />
            {selectedDate && (
              <div className="px-3 py-2">
                <button
                  type="button"
                  onClick={handleClearDate}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "w-full justify-start text-muted-foreground"
                  )}
                >
                  <X className="mr-2 size-4" />
                  Effacer le filtre
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Normalise le paramètre game de l'URL vers un DrawFilter valide */
export function normalizeDrawFilterFromParams(
  game?: string
): DrawFilter | undefined {
  return parseDrawFilter(game);
}
