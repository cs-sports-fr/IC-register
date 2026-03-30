/*
  Warnings:

  - The primary key for the `_MatchToParticipant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_ParticipantToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_TeamPools` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_MatchToParticipant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_ParticipantToProduct` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_TeamPools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "defaultDinnerPlaceId" INTEGER,
ADD COLUMN     "defaultDinnerTime" TEXT;

-- AlterTable
ALTER TABLE "Sport" ADD COLUMN     "defaultBreakfastPlaceSaturdayId" INTEGER,
ADD COLUMN     "defaultBreakfastPlaceSundayFinalistId" INTEGER,
ADD COLUMN     "defaultBreakfastPlaceSundayId" INTEGER,
ADD COLUMN     "defaultBreakfastTimeSaturday" TEXT,
ADD COLUMN     "defaultBreakfastTimeSunday" TEXT,
ADD COLUMN     "defaultBreakfastTimeSundayFinalist" TEXT,
ADD COLUMN     "defaultLunchPlaceSaturdayId" INTEGER,
ADD COLUMN     "defaultLunchPlaceSundayFinalistId" INTEGER,
ADD COLUMN     "defaultLunchPlaceSundayId" INTEGER,
ADD COLUMN     "defaultLunchTimeSaturday" TEXT,
ADD COLUMN     "defaultLunchTimeSunday" TEXT,
ADD COLUMN     "defaultLunchTimeSundayFinalist" TEXT;

-- AlterTable
ALTER TABLE "_MatchToParticipant" DROP CONSTRAINT "_MatchToParticipant_AB_pkey";

-- AlterTable
ALTER TABLE "_ParticipantToProduct" DROP CONSTRAINT "_ParticipantToProduct_AB_pkey";

-- AlterTable
ALTER TABLE "_TeamPools" DROP CONSTRAINT "_TeamPools_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_MatchToParticipant_AB_unique" ON "_MatchToParticipant"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_ParticipantToProduct_AB_unique" ON "_ParticipantToProduct"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamPools_AB_unique" ON "_TeamPools"("A", "B");

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultBreakfastPlaceSaturdayId_fkey" FOREIGN KEY ("defaultBreakfastPlaceSaturdayId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultBreakfastPlaceSundayId_fkey" FOREIGN KEY ("defaultBreakfastPlaceSundayId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultLunchPlaceSaturdayId_fkey" FOREIGN KEY ("defaultLunchPlaceSaturdayId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultLunchPlaceSundayId_fkey" FOREIGN KEY ("defaultLunchPlaceSundayId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultBreakfastPlaceSundayFinalistId_fkey" FOREIGN KEY ("defaultBreakfastPlaceSundayFinalistId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_defaultLunchPlaceSundayFinalistId_fkey" FOREIGN KEY ("defaultLunchPlaceSundayFinalistId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_defaultDinnerPlaceId_fkey" FOREIGN KEY ("defaultDinnerPlaceId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
