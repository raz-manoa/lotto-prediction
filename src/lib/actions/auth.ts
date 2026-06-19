"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return { error: "Cet email est déjà utilisé" };
    }

    if (data.password.length < 8) {
      return { error: "Le mot de passe doit contenir au moins 8 caractères" };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("registerUser failed:", error);

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        error:
          "Base de données inaccessible. Vérifiez DATABASE_URL et lancez pnpm exec prisma db push.",
      };
    }

    return { error: "Impossible de créer le compte. Réessayez plus tard." };
  }
}
