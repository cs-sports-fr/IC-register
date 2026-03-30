-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "swimming100mEventId" INTEGER,
ADD COLUMN     "swimming50mEventId" INTEGER;

-- AlterTable
ALTER TABLE "_MatchToParticipant" ADD CONSTRAINT "_MatchToParticipant_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_MatchToParticipant_AB_unique";

-- AlterTable
ALTER TABLE "_ParticipantToProduct" ADD CONSTRAINT "_ParticipantToProduct_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ParticipantToProduct_AB_unique";

-- AlterTable
ALTER TABLE "_TeamPools" ADD CONSTRAINT "_TeamPools_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_TeamPools_AB_unique";

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_swimming50mEventId_fkey" FOREIGN KEY ("swimming50mEventId") REFERENCES "SwimmingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_swimming100mEventId_fkey" FOREIGN KEY ("swimming100mEventId") REFERENCES "SwimmingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
