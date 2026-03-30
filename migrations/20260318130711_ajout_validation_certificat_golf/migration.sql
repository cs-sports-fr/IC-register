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
