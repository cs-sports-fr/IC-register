/*
  Warnings:

  - You are about to drop the column `numerotente` on the `Participant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Participant" DROP COLUMN "numerotente",
ADD COLUMN     "tentPlanId" INTEGER;

-- CreateTable
CREATE TABLE "public"."TentPlan" (
    "id" SERIAL NOT NULL,
    "row" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "tent_number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "occupation" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TentPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_tentPlanId_fkey" FOREIGN KEY ("tentPlanId") REFERENCES "public"."TentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
