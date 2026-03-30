-- AlterTable
ALTER TABLE "SwimmingEvent" ADD COLUMN     "referenceTimeMen" DOUBLE PRECISION,
ADD COLUMN     "referenceTimeRelay" DOUBLE PRECISION,
ADD COLUMN     "referenceTimeWomen" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SwimmingRelayResult" ALTER COLUMN "timeSeconds" SET DEFAULT 0.0;

-- AlterTable
ALTER TABLE "SwimmingResult" ALTER COLUMN "timeSeconds" SET DEFAULT 0.0;
