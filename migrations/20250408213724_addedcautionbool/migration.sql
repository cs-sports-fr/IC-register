/*
  Warnings:

  - The primary key for the `_ParticipantToProduct` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_TeamPools` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_ParticipantToProduct` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_TeamPools` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "cautionOK" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sport" ADD COLUMN     "imageLink" TEXT NOT NULL DEFAULT 'http://toss-images.s3.eu-west-3.amazonaws.com/sports/foot.jpeg';

-- AlterTable
ALTER TABLE "_ParticipantToProduct" DROP CONSTRAINT "_ParticipantToProduct_AB_pkey";

-- AlterTable
ALTER TABLE "_TeamPools" DROP CONSTRAINT "_TeamPools_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_ParticipantToProduct_AB_unique" ON "_ParticipantToProduct"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_TeamPools_AB_unique" ON "_TeamPools"("A", "B");
