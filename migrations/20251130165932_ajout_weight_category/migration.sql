-- CreateEnum
CREATE TYPE "WeightCategory" AS ENUM ('BoxeH_48kg', 'BoxeH_51kg', 'BoxeH_54kg', 'BoxeH_57kg', 'BoxeH_60kg', 'BoxeH_64kg', 'BoxeH_69kg', 'BoxeH_75kg', 'BoxeH_81kg', 'BoxeH_91kg', 'BoxeH_Plus91kg', 'BoxeF_48kg', 'BoxeF_51kg', 'BoxeF_54kg', 'BoxeF_57kg', 'BoxeF_60kg', 'BoxeF_64kg', 'BoxeF_69kg', 'BoxeF_75kg', 'BoxeF_Plus75kg', 'JudoH_60kg', 'JudoH_66kg', 'JudoH_73kg', 'JudoH_81kg', 'JudoH_90kg', 'JudoH_100kg', 'JudoH_Plus100kg', 'JudoF_48kg', 'JudoF_52kg', 'JudoF_57kg', 'JudoF_63kg', 'JudoF_70kg', 'JudoF_78kg', 'JudoF_Plus78kg');

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "weightCategory" "WeightCategory";
