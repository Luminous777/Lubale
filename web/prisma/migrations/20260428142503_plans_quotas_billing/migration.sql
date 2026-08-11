-- CreateEnum
CREATE TYPE "OrganizationKind" AS ENUM ('business', 'personal');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('free', 'pro', 'business');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('card', 'transfer');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('none', 'trialing', 'active', 'past_due', 'canceled');

-- CreateEnum
CREATE TYPE "AiQuotaScope" AS ENUM ('personal', 'member_card', 'org_branding');

-- CreateEnum
CREATE TYPE "ProfileLinkKind" AS ENUM ('whatsapp', 'email', 'phone', 'web', 'social', 'other');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingCycle" "BillingCycle",
ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "inTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "OrganizationKind" NOT NULL DEFAULT 'business',
ADD COLUMN     "mpSubscriptionId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "plan" "BillingPlan" NOT NULL DEFAULT 'business',
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ProfileLink" ADD COLUMN     "kind" "ProfileLinkKind" NOT NULL DEFAULT 'other';

-- CreateTable
CREATE TABLE "AiQuotaUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "scope" "AiQuotaScope" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "imagesUsed" INTEGER NOT NULL DEFAULT 0,
    "textsUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuotaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "externalRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiQuotaUsage_organizationId_periodStart_idx" ON "AiQuotaUsage"("organizationId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuotaUsage_organizationId_userId_scope_periodStart_key" ON "AiQuotaUsage"("organizationId", "userId", "scope", "periodStart");

-- CreateIndex
CREATE INDEX "BillingInvoice_organizationId_paidAt_idx" ON "BillingInvoice"("organizationId", "paidAt");

-- AddForeignKey
ALTER TABLE "AiQuotaUsage" ADD CONSTRAINT "AiQuotaUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
