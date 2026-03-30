-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "placeId" INTEGER,
ADD COLUMN     "teamOneSource" TEXT,
ADD COLUMN     "teamTwoSource" TEXT;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "numberOfFields" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "sportSaturdayId" INTEGER,
ADD COLUMN     "sportSundayId" INTEGER;

-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "PlaceId" INTEGER;

-- AlterTable
ALTER TABLE "_ParticipantToProduct" ADD CONSTRAINT "_ParticipantToProduct_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ParticipantToProduct_AB_unique";

-- AlterTable
ALTER TABLE "_TeamPools" ADD CONSTRAINT "_TeamPools_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_TeamPools_AB_unique";

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_sportSaturdayId_fkey" FOREIGN KEY ("sportSaturdayId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_sportSundayId_fkey" FOREIGN KEY ("sportSundayId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_PlaceId_fkey" FOREIGN KEY ("PlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
