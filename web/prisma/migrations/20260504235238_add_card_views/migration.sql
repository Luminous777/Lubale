-- CreateTable
CREATE TABLE "CardView" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardView_profileId_viewedAt_idx" ON "CardView"("profileId", "viewedAt");

-- AddForeignKey
ALTER TABLE "CardView" ADD CONSTRAINT "CardView_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
