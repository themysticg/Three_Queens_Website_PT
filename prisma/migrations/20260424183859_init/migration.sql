-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discriminator" TEXT,
    "avatar" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminType" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMember" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "adminType" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisitor" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPath" TEXT,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SiteVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inGameName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "motivation" TEXT NOT NULL,
    "characterStory" TEXT,
    "additionalInfo" TEXT,
    "answers" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "submitterIp" TEXT,
    "submitterDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormQuestion" (
    "id" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "options" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'full',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "salaryTier" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submitterIp" TEXT,
    "submitterDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER NOT NULL,
    "oldPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "statusText" TEXT,
    "buttonLabel" TEXT NOT NULL DEFAULT 'Buy now',
    "purchaseUrl" TEXT,
    "featureList" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submitterIp" TEXT,
    "submitterDiscordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "serverName" TEXT,
    "siteName" TEXT,
    "logoDataUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#f59e0b',
    "headerIcon" TEXT,
    "whitelistNavLabel" TEXT,
    "storeNavLabel" TEXT,
    "discordLink" TEXT,
    "discordWidgetServerId" TEXT,
    "fivemServerDetailId" TEXT,
    "homepageSubtitle" TEXT,
    "storePageTitle" TEXT,
    "storePageDescription" TEXT,
    "topBannerEnabled" BOOLEAN DEFAULT true,
    "topBannerCtaLabel" TEXT,
    "topBannerCtaUrl" TEXT,
    "topBannerMessages" TEXT,
    "footerBadgeLabel" TEXT,
    "footerTagline" TEXT,
    "footerText" TEXT,
    "footerConnectButtonText" TEXT,
    "footerConnectBlurb" TEXT,
    "footerCopyrightNote" TEXT,
    "footerBottomTaglineLeft" TEXT,
    "footerBottomTaglineRight" TEXT,
    "footerNavHeading" TEXT,
    "footerConnectHeading" TEXT,
    "footerDiscordCardTitle" TEXT,
    "discordDmAuthorName" TEXT,
    "dmTemplatesJson" TEXT,
    "homepageContentJson" TEXT,
    "logsWebhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "actorUserId" TEXT,
    "actorDiscordId" TEXT,
    "targetDiscordId" TEXT,
    "ipAddress" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordOnlineSnapshot" (
    "guildId" TEXT NOT NULL,
    "userIds" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordOnlineSnapshot_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "RuleCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSection" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_discordId_key" ON "SiteMember"("discordId");

-- CreateIndex
CREATE INDEX "SiteMember_discordId_idx" ON "SiteMember"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisitor_visitorId_key" ON "SiteVisitor"("visitorId");

-- CreateIndex
CREATE INDEX "SiteVisitor_lastSeenAt_idx" ON "SiteVisitor"("lastSeenAt");

-- CreateIndex
CREATE INDEX "SiteVisitor_userId_idx" ON "SiteVisitor"("userId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "FormQuestion_formType_isActive_sortOrder_idx" ON "FormQuestion"("formType", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FormQuestion_formType_questionKey_key" ON "FormQuestion"("formType", "questionKey");

-- CreateIndex
CREATE INDEX "Job_category_idx" ON "Job"("category");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_idx" ON "JobApplication"("jobId");

-- CreateIndex
CREATE INDEX "JobApplication_userId_idx" ON "JobApplication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_userId_key" ON "JobApplication"("jobId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCategory_name_key" ON "StoreCategory"("name");

-- CreateIndex
CREATE INDEX "StoreCategory_sortOrder_idx" ON "StoreCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "StoreItem_categoryId_idx" ON "StoreItem"("categoryId");

-- CreateIndex
CREATE INDEX "StoreItem_categoryId_isActive_idx" ON "StoreItem"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "StoreItem_sortOrder_idx" ON "StoreItem"("sortOrder");

-- CreateIndex
CREATE INDEX "StaffApplication_status_idx" ON "StaffApplication"("status");

-- CreateIndex
CREATE INDEX "StaffApplication_userId_idx" ON "StaffApplication"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RuleCategory_sortOrder_idx" ON "RuleCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "RuleSection_categoryId_idx" ON "RuleSection"("categoryId");

-- CreateIndex
CREATE INDEX "RuleSection_categoryId_sortOrder_idx" ON "RuleSection"("categoryId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisitor" ADD CONSTRAINT "SiteVisitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "StoreCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffApplication" ADD CONSTRAINT "StaffApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffApplication" ADD CONSTRAINT "StaffApplication_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSection" ADD CONSTRAINT "RuleSection_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RuleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
