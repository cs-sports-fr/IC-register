-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('Incomplete', 'Waiting', 'Awaitingauthorization', 'PrincipalList', 'Validated');

-- CreateEnum
CREATE TYPE "EnumUserStatus" AS ENUM ('UserStatus', 'AdminStatus', 'SuperAdminStatus');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('F', 'M', 'preferNotToSay');

-- CreateEnum
CREATE TYPE "ClassementTennis" AS ENUM ('NC', 'C40', 'C305', 'C304', 'C303', 'C302', 'C301', 'C30', 'C155', 'C154', 'C153', 'C152', 'C151', 'C15', 'C56', 'C46', 'C36', 'C26', 'C16', 'C0');

-- CreateEnum
CREATE TYPE "ArmeEscrime" AS ENUM ('Sabre', 'Epee', 'Fleuret');

-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('Logement', 'Tournoi', 'VT', 'RestaurationSoir', 'Restau', 'Acti');

-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('Roundof64', 'Roundof32', 'Roundof16', 'GroupStage', 'QuarterFinal', 'SemiFinal', 'Final');

-- CreateEnum
CREATE TYPE "mailClient" AS ENUM ('SES', 'MailGun');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Paid', 'Failed', 'Canceled', 'Forged', 'Expired');

-- CreateEnum
CREATE TYPE "MedalType" AS ENUM ('Gold', 'Silver', 'Bronze');

-- CreateTable
CREATE TABLE "Sport" (
    "id" SERIAL NOT NULL,
    "sport" TEXT NOT NULL,
    "nbPlayersMin" INTEGER NOT NULL DEFAULT 1,
    "nbPlayersMax" INTEGER NOT NULL DEFAULT 300,
    "isCollective" BOOLEAN NOT NULL DEFAULT true,
    "nbOfTeams" INTEGER NOT NULL DEFAULT 64,
    "pointsperwin" INTEGER NOT NULL DEFAULT 0,
    "pointsperdraw" INTEGER NOT NULL DEFAULT 0,
    "pointsperdefeat" INTEGER NOT NULL DEFAULT 0,
    "place" TEXT NOT NULL DEFAULT 'X',
    "numberOfPools" INTEGER NOT NULL DEFAULT 8,
    "numberOfFields" INTEGER NOT NULL DEFAULT 2,
    "numberOfFieldsX" INTEGER NOT NULL DEFAULT 2,
    "poolMatchLength" INTEGER NOT NULL DEFAULT 15,
    "nonPoolMatchLength" INTEGER NOT NULL DEFAULT 30,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTimeAfternoon" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTimeSunday" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tournamentDuration" INTEGER NOT NULL DEFAULT 600,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sportId" INTEGER NOT NULL,
    "teamAdminUserId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "amountPaidInCents" INTEGER NOT NULL DEFAULT 0,
    "amountToPayInCents" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT '',
    "tournamentPoints" INTEGER NOT NULL DEFAULT 0,
    "poolmatcheswon" INTEGER NOT NULL DEFAULT 0,
    "poolmatcheslost" INTEGER NOT NULL DEFAULT 0,
    "poolmatchesdraw" INTEGER NOT NULL DEFAULT 0,
    "goalsScored" INTEGER NOT NULL DEFAULT 0,
    "goalsConceded" INTEGER NOT NULL DEFAULT 0,
    "goalDifference" INTEGER NOT NULL DEFAULT 0,
    "isSelectedforKnockoutStage" BOOLEAN NOT NULL DEFAULT false,
    "isMorning" BOOLEAN NOT NULL DEFAULT false,
    "isPlayingInCS" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "status" "EnumUserStatus" NOT NULL DEFAULT 'UserStatus',
    "sportAdminId" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "Type" "PlaceType" NOT NULL DEFAULT 'Logement',

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" SERIAL NOT NULL,
    "gender" "Gender" NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL DEFAULT '0656563425',
    "password" TEXT NOT NULL DEFAULT '230803',
    "status" "EnumUserStatus" NOT NULL DEFAULT 'UserStatus',
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "charteIsValidated" BOOLEAN NOT NULL,
    "chartePassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCaptain" BOOLEAN NOT NULL,
    "licenceID" TEXT NOT NULL,
    "packId" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "hasAllergies" BOOLEAN NOT NULL DEFAULT false,
    "certificateLink" TEXT,
    "charteEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "certificateOK" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION,
    "mailHebergeur" TEXT,
    "classementTennis" "ClassementTennis",
    "classementTT" DOUBLE PRECISION,
    "armeVoeu1" "ArmeEscrime",
    "armeVoeu2" "ArmeEscrime",
    "armeVoeu3" "ArmeEscrime",
    "lieutenteId" INTEGER,
    "lieupetitdejsamediId" INTEGER,
    "lieudejsamediId" INTEGER,
    "lieudinersamediId" INTEGER,
    "lieupetitdejdimancheId" INTEGER,
    "lieudejdimancheId" INTEGER,
    "heurepetitdejsamedi" TEXT,
    "heuredejsamedi" TEXT,
    "heuredinersamedi" TEXT,
    "heurepetitdejdimanche" TEXT,
    "heuredejdimanche" TEXT,
    "navettesamedialler" TEXT,
    "navettesamediretour" TEXT,
    "navettedimanchealler" TEXT,
    "navettedimancheretour" TEXT,
    "numerotente" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" INTEGER NOT NULL,
    "isMorning" BOOLEAN NOT NULL DEFAULT false,
    "isPlayingInCS" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "phase" "PhaseType" NOT NULL,
    "teamOneId" INTEGER,
    "teamTwoId" INTEGER,
    "scoreTeamOne" INTEGER,
    "scoreTeamTwo" INTEGER,
    "matchTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "winnerId" INTEGER,
    "isScheduled" BOOLEAN NOT NULL DEFAULT true,
    "hasStarted" BOOLEAN NOT NULL DEFAULT false,
    "hasEnded" BOOLEAN NOT NULL DEFAULT false,
    "field" INTEGER NOT NULL,
    "isPlayingInCS" BOOLEAN NOT NULL DEFAULT false,
    "bettingOpen" BOOLEAN NOT NULL DEFAULT true,
    "sportId" INTEGER NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" SERIAL NOT NULL,
    "participantId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamBetOnId" INTEGER NOT NULL,
    "pointsBet" INTEGER NOT NULL,
    "betOutcome" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isInIDF" BOOLEAN NOT NULL DEFAULT false,
    "isDeleg" BOOLEAN NOT NULL DEFAULT false,
    "pictureLink" TEXT,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pack" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,
    "isAllowedInIDF" BOOLEAN NOT NULL DEFAULT true,
    "isBreakfastIncluded" BOOLEAN NOT NULL DEFAULT false,
    "isLunchIncluded" BOOLEAN NOT NULL DEFAULT false,
    "isDinnerIncluded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "priceInCents" INTEGER NOT NULL,
    "pictureLink" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralConfig" (
    "id" SERIAL NOT NULL,
    "editionYear" INTEGER NOT NULL,
    "isRegistrationOpen" BOOLEAN NOT NULL,
    "isPaymentOpen" BOOLEAN NOT NULL,
    "canSendEmails" BOOLEAN NOT NULL DEFAULT true,
    "expectedRegistrationDate" TIMESTAMP(3) NOT NULL,
    "mailClient" "mailClient" NOT NULL DEFAULT 'SES',

    CONSTRAINT "GeneralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "requestId" TEXT,
    "requestUuid" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medal" (
    "id" SERIAL NOT NULL,
    "type" "MedalType" NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "sportId" INTEGER NOT NULL,

    CONSTRAINT "Medal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ParticipantToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ParticipantToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TeamPools" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TeamPools_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE INDEX "_ParticipantToProduct_B_index" ON "_ParticipantToProduct"("B");

-- CreateIndex
CREATE INDEX "_TeamPools_B_index" ON "_TeamPools"("B");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_teamAdminUserId_fkey" FOREIGN KEY ("teamAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sportAdminId_fkey" FOREIGN KEY ("sportAdminId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieutenteId_fkey" FOREIGN KEY ("lieutenteId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieupetitdejsamediId_fkey" FOREIGN KEY ("lieupetitdejsamediId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieudejsamediId_fkey" FOREIGN KEY ("lieudejsamediId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieudinersamediId_fkey" FOREIGN KEY ("lieudinersamediId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieupetitdejdimancheId_fkey" FOREIGN KEY ("lieupetitdejdimancheId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_lieudejdimancheId_fkey" FOREIGN KEY ("lieudejdimancheId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamOneId_fkey" FOREIGN KEY ("teamOneId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamTwoId_fkey" FOREIGN KEY ("teamTwoId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_teamBetOnId_fkey" FOREIGN KEY ("teamBetOnId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medal" ADD CONSTRAINT "Medal_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medal" ADD CONSTRAINT "Medal_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantToProduct" ADD CONSTRAINT "_ParticipantToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ParticipantToProduct" ADD CONSTRAINT "_ParticipantToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamPools" ADD CONSTRAINT "_TeamPools_A_fkey" FOREIGN KEY ("A") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamPools" ADD CONSTRAINT "_TeamPools_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
