export const dynamic = "force-dynamic";

import { getSavedTickets } from "@/lib/actions/predictions";
import { GAMES } from "@/lib/games";
import { formatShortDate } from "@/lib/utils";
import { NumberBalls } from "@/components/number-grid";
import { Badge } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UnsaveButton } from "./unsave-button";

export default async function TicketsPage() {
  const tickets = await getSavedTickets();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes tickets</h1>
        <p className="mt-1 text-gray-600">
          Tickets sauvegardés à jouer dans les box Lottotech
        </p>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Aucun ticket sauvegardé.{" "}
              <a href="/predict" className="text-emerald-600 hover:underline">
                Générer des prédictions
              </a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket, i) => (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Ticket {i + 1} — {GAMES[ticket.prediction.game].name}
                    </CardTitle>
                    <CardDescription>
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
                <NumberBalls numbers={ticket.numbers} />
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
          ))}
        </div>
      )}
    </div>
  );
}
