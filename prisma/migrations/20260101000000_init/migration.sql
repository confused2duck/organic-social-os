-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "dataLabel" TEXT NOT NULL DEFAULT 'provided',
    "status" TEXT NOT NULL DEFAULT 'active',
    "website" TEXT,
    "industry" TEXT,
    "markets" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "positioning" TEXT,
    "messaging" TEXT,
    "differentiators" TEXT,
    "brandVoice" TEXT,
    "icp" TEXT,
    "objectives" TEXT,
    "audiencePriorities" TEXT,
    "logoUrl" TEXT,
    "colors" TEXT,
    "fonts" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "postsPerDay" TEXT NOT NULL DEFAULT '{}',
    "publishingDays" TEXT NOT NULL DEFAULT '[]',
    "preferredTimes" TEXT NOT NULL DEFAULT '{}',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "contentFormats" TEXT NOT NULL DEFAULT '[]',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "autonomy" TEXT NOT NULL DEFAULT '{}',
    "autopublish" BOOLEAN NOT NULL DEFAULT false,
    "pausedWorkflows" TEXT NOT NULL DEFAULT '[]',
    "weeklyReportDay" INTEGER NOT NULL DEFAULT 1,
    "weeklyReportTime" TEXT NOT NULL DEFAULT '08:00',
    "reportRecipients" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'document',
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "provenance" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'logo',
    "name" TEXT NOT NULL,
    "url" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "demographics" TEXT,
    "goals" TEXT,
    "painPoints" TEXT,
    "buyingMotivations" TEXT,
    "channels" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "handles" TEXT,
    "notes" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandClaim" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'approved',
    "text" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "features" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IcpProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "firmographics" TEXT,
    "triggers" TEXT,
    "segments" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'fact',
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConnection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "capabilities" TEXT,
    "connectedAt" TIMESTAMP(3),
    "meta" TEXT,
    "externalId" TEXT,
    "accountType" TEXT,
    "scopes" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'none',
    "tokenCipher" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "generatedBy" TEXT NOT NULL DEFAULT 'deterministic_generation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "researchItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "retrievedDate" TEXT,
    "excerpt" TEXT,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT,
    "summary" TEXT,
    "objectives" TEXT,
    "pillars" TEXT,
    "platformPlans" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "generatedBy" TEXT NOT NULL DEFAULT 'deterministic_generation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "strategyId" TEXT,
    "platform" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "topic" TEXT NOT NULL,
    "targetAudience" TEXT,
    "objective" TEXT,
    "mainMessage" TEXT,
    "caption" TEXT,
    "hashtags" TEXT,
    "creativeRequirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validationStatus" TEXT NOT NULL DEFAULT 'unchecked',
    "validationNotes" TEXT,
    "generatedBy" TEXT NOT NULL DEFAULT 'deterministic_generation',
    "sourcesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "spec" TEXT,
    "capabilityState" TEXT NOT NULL DEFAULT 'draft',
    "renderPath" TEXT,
    "thumbnailPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "bytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishAttempt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "connectionId" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "PublishAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDaily" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "profileVisits" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'test_fixture',

    CONSTRAINT "AnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "videoViews" INTEGER NOT NULL DEFAULT 0,
    "retentionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'test_fixture',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMessage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "author" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentiment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "replyDraft" TEXT,
    "source" TEXT NOT NULL DEFAULT 'test_fixture',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "platformResults" TEXT,
    "findings" TEXT,
    "recommendations" TEXT,
    "nextWeekPlan" TEXT,
    "dataBasis" TEXT NOT NULL DEFAULT 'test_fixture',
    "html" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "generatedBy" TEXT NOT NULL DEFAULT 'deterministic_generation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDelivery" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "recipients" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "providerMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "postId" TEXT,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "agentKey" TEXT,
    "agentSystem" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "payload" TEXT,
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "idempotencyKey" TEXT,
    "dependsOnId" TEXT,
    "excelActivityRef" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "taskId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "agentKey" TEXT,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCatalog" (
    "id" TEXT NOT NULL,
    "excelId" TEXT NOT NULL,
    "sourceParagraph" TEXT,
    "itemType" TEXT,
    "domain" TEXT NOT NULL,
    "workstream" TEXT NOT NULL,
    "track" TEXT,
    "activity" TEXT NOT NULL,
    "assignedAgent" TEXT NOT NULL,
    "executionMode" TEXT,
    "trigger" TEXT,
    "integrations" TEXT,
    "output" TEXT,
    "kpi" TEXT,
    "guardrail" TEXT,
    "releaseWave" TEXT,
    "scope" TEXT NOT NULL,
    "agentSystem" TEXT,
    "implementationStatus" TEXT NOT NULL DEFAULT 'planned',
    "implementedIn" TEXT,
    "testEvidence" TEXT,

    CONSTRAINT "ActivityCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentSystem" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "domains" TEXT,
    "responsibilities" TEXT,
    "activityCount" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'organic',

    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyConfig_companyId_key" ON "CompanyConfig"("companyId");

-- CreateIndex
CREATE INDEX "BrandDocument_companyId_idx" ON "BrandDocument"("companyId");

-- CreateIndex
CREATE INDEX "BrandAsset_companyId_idx" ON "BrandAsset"("companyId");

-- CreateIndex
CREATE INDEX "Persona_companyId_idx" ON "Persona"("companyId");

-- CreateIndex
CREATE INDEX "Competitor_companyId_idx" ON "Competitor"("companyId");

-- CreateIndex
CREATE INDEX "BrandClaim_companyId_idx" ON "BrandClaim"("companyId");

-- CreateIndex
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");

-- CreateIndex
CREATE INDEX "IcpProfile_companyId_idx" ON "IcpProfile"("companyId");

-- CreateIndex
CREATE INDEX "KnowledgeItem_companyId_idx" ON "KnowledgeItem"("companyId");

-- CreateIndex
CREATE INDEX "KnowledgeItem_sourceDocumentId_idx" ON "KnowledgeItem"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "PlatformConnection_companyId_idx" ON "PlatformConnection"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConnection_companyId_platform_key" ON "PlatformConnection"("companyId", "platform");

-- CreateIndex
CREATE INDEX "ResearchItem_companyId_idx" ON "ResearchItem"("companyId");

-- CreateIndex
CREATE INDEX "ResearchItem_companyId_category_idx" ON "ResearchItem"("companyId", "category");

-- CreateIndex
CREATE INDEX "ResearchSource_researchItemId_idx" ON "ResearchSource"("researchItemId");

-- CreateIndex
CREATE INDEX "Strategy_companyId_idx" ON "Strategy"("companyId");

-- CreateIndex
CREATE INDEX "ContentPost_companyId_idx" ON "ContentPost"("companyId");

-- CreateIndex
CREATE INDEX "ContentPost_companyId_scheduledFor_idx" ON "ContentPost"("companyId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ContentPost_companyId_status_idx" ON "ContentPost"("companyId", "status");

-- CreateIndex
CREATE INDEX "CreativeAsset_companyId_idx" ON "CreativeAsset"("companyId");

-- CreateIndex
CREATE INDEX "CreativeAsset_postId_idx" ON "CreativeAsset"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishAttempt_idempotencyKey_key" ON "PublishAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PublishAttempt_companyId_idx" ON "PublishAttempt"("companyId");

-- CreateIndex
CREATE INDEX "PublishAttempt_postId_idx" ON "PublishAttempt"("postId");

-- CreateIndex
CREATE INDEX "AnalyticsDaily_companyId_idx" ON "AnalyticsDaily"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDaily_companyId_platform_date_key" ON "AnalyticsDaily"("companyId", "platform", "date");

-- CreateIndex
CREATE INDEX "PostMetric_companyId_idx" ON "PostMetric"("companyId");

-- CreateIndex
CREATE INDEX "PostMetric_postId_idx" ON "PostMetric"("postId");

-- CreateIndex
CREATE INDEX "CommunityMessage_companyId_idx" ON "CommunityMessage"("companyId");

-- CreateIndex
CREATE INDEX "CommunityMessage_companyId_status_idx" ON "CommunityMessage"("companyId", "status");

-- CreateIndex
CREATE INDEX "Report_companyId_idx" ON "Report"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDelivery_reportId_key" ON "EmailDelivery"("reportId");

-- CreateIndex
CREATE INDEX "EmailDelivery_companyId_idx" ON "EmailDelivery"("companyId");

-- CreateIndex
CREATE INDEX "Approval_companyId_idx" ON "Approval"("companyId");

-- CreateIndex
CREATE INDEX "Approval_companyId_status_idx" ON "Approval"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Task_idempotencyKey_key" ON "Task"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_companyId_status_idx" ON "Task"("companyId", "status");

-- CreateIndex
CREATE INDEX "ExecutionLog_companyId_idx" ON "ExecutionLog"("companyId");

-- CreateIndex
CREATE INDEX "ExecutionLog_taskId_idx" ON "ExecutionLog"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCatalog_excelId_key" ON "ActivityCatalog"("excelId");

-- CreateIndex
CREATE INDEX "ActivityCatalog_domain_idx" ON "ActivityCatalog"("domain");

-- CreateIndex
CREATE INDEX "ActivityCatalog_scope_idx" ON "ActivityCatalog"("scope");

-- CreateIndex
CREATE INDEX "ActivityCatalog_agentSystem_idx" ON "ActivityCatalog"("agentSystem");

-- CreateIndex
CREATE INDEX "ActivityCatalog_assignedAgent_idx" ON "ActivityCatalog"("assignedAgent");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_name_key" ON "AgentDefinition"("name");

-- AddForeignKey
ALTER TABLE "CompanyConfig" ADD CONSTRAINT "CompanyConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDocument" ADD CONSTRAINT "BrandDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandClaim" ADD CONSTRAINT "BrandClaim_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IcpProfile" ADD CONSTRAINT "IcpProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "BrandDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformConnection" ADD CONSTRAINT "PlatformConnection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_researchItemId_fkey" FOREIGN KEY ("researchItemId") REFERENCES "ResearchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAsset" ADD CONSTRAINT "CreativeAsset_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishAttempt" ADD CONSTRAINT "PublishAttempt_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishAttempt" ADD CONSTRAINT "PublishAttempt_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsDaily" ADD CONSTRAINT "AnalyticsDaily_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMetric" ADD CONSTRAINT "PostMetric_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMessage" ADD CONSTRAINT "CommunityMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
