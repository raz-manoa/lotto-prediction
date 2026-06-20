export const dynamic = "force-dynamic";

import { getSavedTickets } from "@/lib/actions/predictions";
import { GAMES, getGameColors } from "@/lib/games";
import { cn, formatShortDate } from "@/lib/utils";
import { NumberBalls } from "@/components/number-grid";
import { Badge } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UnsaveButton } from "./unsave-button";
import { Ticket } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 10;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const allTickets = await getSavedTickets();

  const totalPages = Math.max(1, Math.ceil(allTickets.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const tickets = allTickets.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function buildHref(p: number) {
    return `/tickets?page=${p}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Mes tickets</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Tickets sauvegardés à jouer dans les box Lottotech
        </p>
      </div>

      {allTickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="rounded-full bg-gray-100 p-4">
                <Ticket className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-700">Aucun ticket sauvegardé</p>
                <p className="mt-1 text-sm text-gray-500">
                  <Link href="/predict" className="text-emerald-600 hover:underline">
                    Générez des prédictions
                  </Link>{" "}
                  et sauvegardez vos tickets ici.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {allTickets.length > PAGE_SIZE && (
            <p className="text-sm text-gray-500">
              {allTickets.length} ticket(s) · Page {safePage}/{totalPages}
            </p>
          )}
          <div className="space-y-4">
            {tickets.map((ticket, i) => {
              const globalIndex = (safePage - 1) * PAGE_SIZE + i + 1;
              return (
                <Card key={ticket.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                          <span>Ticket {globalIndex}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              getGameColors(ticket.prediction.game).badge
                            )}
                          >
                            {GAMES[ticket.prediction.game].name}
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-xs sm:text-sm">
                          Créé le {formatShortDate(ticket.createdAt)}
                          {ticket.targetDrawDate &&
                            ` · Tirage cible: ${formatShortDate(ticket.targetDrawDate)}`}
                          {" · "}Modèle: {ticket.prediction.model}
                        </CardDescription>
                      </div>
                      <UnsaveButton ticketId={ticket.id} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <NumberBalls
                      numbers={ticket.numbers}
                      game={ticket.prediction.game}
                    />
                    <p className="text-sm text-gray-600">{ticket.explanation}</p>
                    {ticket.results.length > 0 && (
                      <div className="rounded-md bg-gray-50 p-3 text-sm">
                        <p className="font-medium">Résultats de vérification:</p>
                        {ticket.results.map((r) => (
                          <div key={r.id} className="mt-2">
                            <span>
                              {formatShortDate(r.draw.date)}: {r.matchCount} match(s)
                            </span>
                            {r.tier && (
                              <Badge variant="success" className="ml-2">
                                {r.tier}
                              </Badge>
                            )}
                            {r.matchedNumbers.length > 0 && (
                              <span className="ml-2 text-gray-500">
                                ({r.matchedNumbers.join(", ")})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            buildHref={buildHref}
          />
        </>
      )}
    </div>
  );
}
