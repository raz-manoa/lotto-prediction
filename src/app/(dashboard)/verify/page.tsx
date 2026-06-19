export const dynamic = "force-dynamic";

import { getDraws } from "@/lib/actions/draws";
import { formatShortDate } from "@/lib/utils";
import { VerifyClient } from "./verify-client";

export default async function VerifyPage() {
  const draws = await getDraws();

  const drawOptions = draws.map((d) => ({
    id: d.id,
    game: d.game,
    date: formatShortDate(d.date),
    day: d.day,
    numbers: d.numbers,
  }));

  return <VerifyClient draws={drawOptions} />;
}
