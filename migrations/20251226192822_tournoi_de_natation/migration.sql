-- CreateEnum
CREATE TYPE "SwimmingEventType" AS ENUM ('Relais4x50mNageLibre', 'Relais4x50m4Nages', 'Epreuve100mPapillon', 'Epreuve100mDos', 'Epreuve100mBrasse', 'Epreuve100mNageLibre', 'Epreuve50mPapillon', 'Epreuve50mDos', 'Epreuve50mBrasse', 'Epreuve50mNageLibre');

-- CreateEnum
CREATE TYPE "SwimmingEventDistance" AS ENUM ('Distance50m', 'Distance100m', 'DistanceRelais');

-- CreateEnum
CREATE TYPE "SwimmingStroke" AS ENUM ('Papillon', 'Dos', 'Brasse', 'NageLibre', 'QuatreNages');

-- AlterEnum
ALTER TYPE "PhaseType" ADD VALUE 'Competition';

-- CreateTable
CREATE TABLE "SwimmingEvent" (
    "id" SERIAL NOT NULL,
    "eventType" "SwimmingEventType" NOT NULL,
    "distance" "SwimmingEventDistance" NOT NULL,
    "stroke" "SwimmingStroke",
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sportId" INTEGER NOT NULL,
    "isRelay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwimmingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimmingResult" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "timeSeconds" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimmingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwimmingRelayResult" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "timeSeconds" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwimmingRelayResult_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SwimmingEvent" ADD CONSTRAINT "SwimmingEvent_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimmingResult" ADD CONSTRAINT "SwimmingResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SwimmingEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimmingResult" ADD CONSTRAINT "SwimmingResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimmingResult" ADD CONSTRAINT "SwimmingResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimmingRelayResult" ADD CONSTRAINT "SwimmingRelayResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SwimmingEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwimmingRelayResult" ADD CONSTRAINT "SwimmingRelayResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
