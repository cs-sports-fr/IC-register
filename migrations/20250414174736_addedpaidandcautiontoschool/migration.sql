-- AlterTable
ALTER TABLE "School" ADD COLUMN     "isCautionPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false;
