-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "raceTimeSeconds" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "isBreakfast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDinner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLunch" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isConvocationGenerated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_MatchToParticipant" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MatchToParticipant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_MatchToParticipant_B_index" ON "_MatchToParticipant"("B");

-- AddForeignKey
ALTER TABLE "_MatchToParticipant" ADD CONSTRAINT "_MatchToParticipant_A_fkey" FOREIGN KEY ("A") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MatchToParticipant" ADD CONSTRAINT "_MatchToParticipant_B_fkey" FOREIGN KEY ("B") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
