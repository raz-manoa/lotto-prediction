-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Game" AS ENUM ('LOTO_VERT', 'LOTO', 'LOTO_PLUS');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('ANTHROPIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "provider" "AiProvider" NOT NULL DEFAULT 'ANTHROPIC',
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "apiKeyEncrypted" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draw" (
    "id" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "date" DATE NOT NULL,
    "day" TEXT NOT NULL,
    "numbers" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Draw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" "Game" NOT NULL,
    "model" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionTicket" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "numbers" INTEGER[],
    "explanation" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "targetDrawDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketResult" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "matchedNumbers" INTEGER[],
    "matchCount" INTEGER NOT NULL,
    "tier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "AiConfig_userId_idx" ON "AiConfig"("userId");

-- CreateIndex
CREATE INDEX "Draw_game_date_idx" ON "Draw"("game", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Draw_game_date_key" ON "Draw"("game", "date");

-- CreateIndex
CREATE INDEX "Prediction_userId_createdAt_idx" ON "Prediction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PredictionTicket_predictionId_idx" ON "PredictionTicket"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionTicket_saved_idx" ON "PredictionTicket"("saved");

-- CreateIndex
CREATE INDEX "TicketResult_ticketId_idx" ON "TicketResult"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketResult_ticketId_drawId_key" ON "TicketResult"("ticketId", "drawId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfig" ADD CONSTRAINT "AiConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTicket" ADD CONSTRAINT "PredictionTicket_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketResult" ADD CONSTRAINT "TicketResult_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PredictionTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketResult" ADD CONSTRAINT "TicketResult_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
