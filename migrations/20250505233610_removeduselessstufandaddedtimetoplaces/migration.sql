/*
  Warnings:

  - You are about to drop the column `bettingOpen` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `isPlayingInCS` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `isPlayingInCS` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `nonPoolMatchLength` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfFields` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfFieldsX` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfPools` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `place` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `startTimeAfternoon` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentDuration` on the `Sport` table. All the data in the column will be lost.
  - You are about to drop the column `isMorning` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `isPlayingInCS` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the `Bet` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TiebreakerCriterion" AS ENUM ('TournamentPoints', 'GoalDifference', 'GoalsScored', 'GoalsConceded', 'HeadToHead', 'FairPlay', 'MatchesWon');

-- DropForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT "Bet_matchId_fkey";

-- DropForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT "Bet_participantId_fkey";

-- DropForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT "Bet_teamBetOnId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "bettingOpen",
DROP COLUMN "isPlayingInCS";

-- AlterTable
ALTER TABLE "Participant" DROP COLUMN "points";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "startTimeAfternoon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "startTimeSunday" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Pool" DROP COLUMN "isPlayingInCS";

-- AlterTable
ALTER TABLE "Sport" DROP COLUMN "nonPoolMatchLength",
DROP COLUMN "numberOfFields",
DROP COLUMN "numberOfFieldsX",
DROP COLUMN "numberOfPools",
DROP COLUMN "place",
DROP COLUMN "startTime",
DROP COLUMN "startTimeAfternoon",
DROP COLUMN "tournamentDuration",
ADD COLUMN     "tiebreakerOrder" "TiebreakerCriterion"[] DEFAULT ARRAY['HeadToHead', 'GoalsConceded', 'FairPlay', 'TournamentPoints', 'GoalsScored', 'GoalDifference', 'MatchesWon']::"TiebreakerCriterion"[];

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "isMorning",
DROP COLUMN "isPlayingInCS";

-- DropTable
DROP TABLE "Bet";
