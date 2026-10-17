-- CreateEnum
CREATE TYPE "CompanyKind" AS ENUM ('PETSHOP', 'VET_CLINIC', 'GROOMING', 'STORE', 'OTHER');

-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "address" VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN     "delivers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "description" VARCHAR(500) NOT NULL DEFAULT '',
ADD COLUMN     "kind" "CompanyKind" NOT NULL DEFAULT 'PETSHOP',
ADD COLUMN     "neighborhood" VARCHAR(80) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "species" "Species"[] DEFAULT ARRAY[]::"Species"[];
