/*
  Warnings:

  - Changed the type of `visibility` on the `Flow` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `Flow` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "FlowVisibility" AS ENUM ('private', 'shared', 'public');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable
ALTER TABLE "Flow" DROP COLUMN "visibility",
ADD COLUMN     "visibility" "FlowVisibility" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "FlowStatus" NOT NULL;
