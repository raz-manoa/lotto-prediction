"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
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
}
