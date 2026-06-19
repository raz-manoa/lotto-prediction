"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { revalidatePath } from "next/cache";
import { AiProvider } from "@prisma/client";

export async function getAiConfigs() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const configs = await prisma.aiConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      maxTokens: true,
      temperature: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      apiKeyEncrypted: true,
    },
  });

  return configs.map((c) => {
    let apiKeyPreview: string | null = null;
    if (c.apiKeyEncrypted) {
      try {
        apiKeyPreview = `${decrypt(c.apiKeyEncrypted).slice(0, 4)}••••`;
      } catch {
        apiKeyPreview = "••••••••";
      }
    }
    return {
      id: c.id,
      name: c.name,
      provider: c.provider,
      model: c.model,
      maxTokens: c.maxTokens,
      temperature: c.temperature,
      isDefault: c.isDefault,
      hasApiKey: !!c.apiKeyEncrypted,
      apiKeyPreview,
    };
  });
}

export async function getDefaultAiConfig() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const config = await prisma.aiConfig.findFirst({
    where: { userId: session.user.id, isDefault: true },
  });

  if (!config) {
    return prisma.aiConfig.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }

  return config;
}

export async function getDecryptedApiKey(configId: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const config = await prisma.aiConfig.findFirst({
    where: { id: configId, userId: session.user.id },
  });

  if (!config?.apiKeyEncrypted) return null;
  return decrypt(config.apiKeyEncrypted);
}

export async function createAiConfig(data: {
  name: string;
  provider: AiProvider;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  isDefault?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  if (data.isDefault) {
    await prisma.aiConfig.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const config = await prisma.aiConfig.create({
    data: {
      userId: session.user.id,
      name: data.name,
      provider: data.provider,
      model: data.model,
      apiKeyEncrypted: encrypt(data.apiKey),
      maxTokens: data.maxTokens,
      temperature: data.temperature,
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/settings");
  return { id: config.id };
}

export async function updateAiConfig(
  id: string,
  data: {
    name?: string;
    model?: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
    isDefault?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const existing = await prisma.aiConfig.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) throw new Error("Configuration introuvable");

  if (data.isDefault) {
    await prisma.aiConfig.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  await prisma.aiConfig.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.apiKey !== undefined && {
        apiKeyEncrypted: encrypt(data.apiKey),
      }),
      ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
      ...(data.temperature !== undefined && { temperature: data.temperature }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  });

  revalidatePath("/settings");
}

export async function deleteAiConfig(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.aiConfig.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/settings");
}

export async function setDefaultAiConfig(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.aiConfig.updateMany({
    where: { userId: session.user.id },
    data: { isDefault: false },
  });

  await prisma.aiConfig.updateMany({
    where: { id, userId: session.user.id },
    data: { isDefault: true },
  });

  revalidatePath("/settings");
}
