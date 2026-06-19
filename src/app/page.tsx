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
        <h1 className="text-3xl font-bold tracking-tight text-emerald-800 sm:text-4xl md:text-5xl">
          Lotto MU
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Gérez vos tirages, analysez l&apos;historique et générez des
          prédictions IA pour Loto Vert, Loto et Loto+.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">Se connecter</Button>
          </Link>
          <Link href="/login?register=1" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Créer un compte
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid gap-4 text-left sm:gap-6 md:grid-cols-3">
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
