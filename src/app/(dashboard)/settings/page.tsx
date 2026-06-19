"use client";

import { useEffect, useState } from "react";
import { ANTHROPIC_MODELS } from "@/lib/games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAiConfigs,
  createAiConfig,
  updateAiConfig,
  deleteAiConfig,
  setDefaultAiConfig,
} from "@/lib/actions/settings";

type AiConfigView = Awaited<ReturnType<typeof getAiConfigs>>[number];

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AiConfigView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("Default");
  const [model, setModel] = useState<string>(ANTHROPIC_MODELS[0].id);
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [isDefault, setIsDefault] = useState(false);

  async function loadConfigs() {
    setLoading(true);
    try {
      const data = await getAiConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  function resetForm() {
    setName("Default");
    setModel(ANTHROPIC_MODELS[0].id);
    setApiKey("");
    setMaxTokens(4096);
    setTemperature(0.7);
    setIsDefault(false);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await updateAiConfig(editingId, {
          name,
          model,
          ...(apiKey ? { apiKey } : {}),
          maxTokens,
          temperature,
          isDefault,
        });
        setMessage("Configuration mise à jour");
      } else {
        if (!apiKey) {
          setError("La clé API est requise");
          return;
        }
        await createAiConfig({
          name,
          provider: "ANTHROPIC",
          model,
          apiKey,
          maxTokens,
          temperature,
          isDefault,
        });
        setMessage("Configuration créée");
      }
      resetForm();
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette configuration ?")) return;
    await deleteAiConfig(id);
    await loadConfigs();
  }

  async function handleSetDefault(id: string) {
    await setDefaultAiConfig(id);
    await loadConfigs();
  }

  function startEdit(config: AiConfigView) {
    setEditingId(config.id);
    setName(config.name);
    setModel(config.model);
    setApiKey("");
    setMaxTokens(config.maxTokens);
    setTemperature(config.temperature);
    setIsDefault(config.isDefault);
    setShowForm(true);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Paramètres IA</h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Configurez votre clé API Claude (BYOK). La clé est chiffrée et
            jamais affichée en clair.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="shrink-0">
          Nouvelle config
        </Button>
      </div>

      {message && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p>Chargement...</p>
      ) : configs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Aucune configuration. Ajoutez votre clé API Anthropic pour
              générer des prédictions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription>
                      {config.model} · {config.provider}
                      {config.isDefault && " · Par défaut"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!config.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(config.id)}
                      >
                        Par défaut
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(config)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>Clé API: {config.hasApiKey ? config.apiKeyPreview : "—"}</p>
                <p>Max tokens: {config.maxTokens} · Température: {config.temperature}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Modifier la configuration" : "Nouvelle configuration"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Modèle Claude</Label>
                <Select value={model} onChange={(e) => setModel(e.target.value)}>
                  {ANTHROPIC_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Clé API Anthropic {editingId && "(laisser vide pour conserver)"}
                </Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  required={!editingId}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max tokens</Label>
                  <Input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    min={256}
                    max={8192}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Température</Label>
                  <Input
                    type="number"
                    step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    min={0}
                    max={1}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Configuration par défaut
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? "Mettre à jour" : "Créer"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
