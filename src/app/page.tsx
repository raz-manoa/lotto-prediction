import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-800 md:text-5xl">
          Lotto MU
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Gérez vos tirages, analysez l&apos;historique et générez des
          prédictions IA pour Loto Vert, Loto et Loto+.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/login">
            <Button size="lg">Se connecter</Button>
          </Link>
          <Link href="/login?register=1">
            <Button variant="outline" size="lg">
              Créer un compte
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-6 text-left md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loto Vert</CardTitle>
              <CardDescription>7 numéros · 1–28 · Mar & Ven</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Importez l&apos;historique, consultez les stats et générez des
              tickets.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loto</CardTitle>
              <CardDescription>6 numéros · 1–40 · Mer & Sam</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Tirage principal avec jackpots progressifs.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loto+</CardTitle>
              <CardDescription>6 numéros · 1–40 · Mer & Sam</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Tirage secondaire le même jour que le Loto.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
