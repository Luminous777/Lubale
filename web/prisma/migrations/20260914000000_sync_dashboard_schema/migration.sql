-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('nuevo', 'evento', 'contactado');

-- AlterTable
ALTER TABLE "BillingInvoice" ALTER COLUMN "paymentMethod" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "profileId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "designLocks" JSONB,
ADD COLUMN     "disabledCardBehavior" TEXT DEFAULT '404',
ADD COLUMN     "disabledCardMessage" TEXT,
ADD COLUMN     "layout" TEXT,
ADD COLUMN     "photoShape" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "typePair" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "bgMode" TEXT NOT NULL DEFAULT 'ninguno',
ADD COLUMN     "layout" TEXT,
ADD COLUMN     "photoShape" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "typePair" TEXT;

-- AlterTable
ALTER TABLE "ProfileLink" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "note" TEXT,
    "wantsCard" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'nuevo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_profileId_createdAt_idx" ON "Lead"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicToken_tokenHash_key" ON "MagicToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MagicToken_email_idx" ON "MagicToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_key_key" ON "WebhookEvent"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_externalRef_key" ON "BillingInvoice"("externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_profileId_key" ON "Membership"("profileId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

