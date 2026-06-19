"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { GAME_LIST } from "@/lib/games";
import { Game } from "@prisma/client";

export function DrawsFilter({ currentGame }: { currentGame?: Game }) {
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
      value={currentGame ?? ""}
      onChange={handleChange}
      className="w-full sm:max-w-xs"
    >
      <option value="">Tous les jeux</option>
      {GAME_LIST.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </Select>
  );
}
