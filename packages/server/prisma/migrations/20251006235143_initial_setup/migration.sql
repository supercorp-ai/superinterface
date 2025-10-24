-- CreateEnum
CREATE TYPE "ApiKeyType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('ICON', 'IMAGE', 'EMOJI');

-- CreateEnum
CREATE TYPE "ClientToolHandlerType" AS ENUM ('FUNCTION');

-- CreateEnum
CREATE TYPE "ComputerUseToolEnvironment" AS ENUM ('LINUX', 'WINDOWS', 'MACOS', 'BROWSER');

-- CreateEnum
CREATE TYPE "FirecrawlHandlerType" AS ENUM ('SCRAPE', 'CRAWL', 'EXTRACT', 'SEARCH');

-- CreateEnum
CREATE TYPE "HandlerType" AS ENUM ('REQUEST', 'FIRECRAWL', 'ASSISTANT', 'REPLICATE', 'CLIENT_TOOL', 'CREATE_TASK', 'LIST_TASKS', 'UPDATE_TASK', 'DELETE_TASK');

-- CreateEnum
CREATE TYPE "IconAvatarName" AS ENUM ('BACKPACK', 'ROCKET', 'MAGIC_WAND', 'CUBE', 'TARGET', 'DISC', 'GLOBE', 'STAR', 'LIGHTNING_BOLT', 'FACE', 'PERSON', 'HEART');

-- CreateEnum
CREATE TYPE "ImageGenerationToolOutputFormat" AS ENUM ('PNG', 'WEBP', 'JPEG');

-- CreateEnum
CREATE TYPE "ImageGenerationToolQuality" AS ENUM ('AUTO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ImageGenerationToolSize" AS ENUM ('AUTO', 'SIZE_1024_1024', 'SIZE_1024_1536', 'SIZE_1536_1024');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "LogRequestMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "LogRequestRoute" AS ENUM ('ASSISTANTS', 'MESSAGES', 'FILES', 'TTS');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('IN_PROGRESS', 'INCOMPLETE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MethodType" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "ModelProviderType" AS ENUM ('OPENAI', 'ANTHROPIC', 'PERPLEXITY', 'GROQ', 'MISTRAL', 'TOGETHER', 'OPEN_ROUTER', 'AZURE_OPENAI', 'OLLAMA', 'HUMIRIS', 'GOOGLE');

-- CreateEnum
CREATE TYPE "ReplicateHandlerType" AS ENUM ('RUN');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'REQUIRES_ACTION', 'CANCELLING', 'CANCELLED', 'FAILED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RunStepStatus" AS ENUM ('IN_PROGRESS', 'CANCELLED', 'FAILED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RunStepType" AS ENUM ('MESSAGE_CREATION', 'TOOL_CALLS');

-- CreateEnum
CREATE TYPE "StorageProviderType" AS ENUM ('OPENAI', 'AZURE_OPENAI', 'SUPERINTERFACE_CLOUD', 'OPENAI_RESPONSES', 'AZURE_OPENAI_RESPONSES');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('FILE_SEARCH', 'WEB_SEARCH', 'CODE_INTERPRETER', 'IMAGE_GENERATION', 'COMPUTER_USE');

-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('STDIO', 'SSE', 'HTTP');

-- CreateEnum
CREATE TYPE "UserRoleType" AS ENUM ('ADMIN');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ApiKeyType" NOT NULL DEFAULT 'PUBLIC',
    "name" TEXT NOT NULL DEFAULT '',
    "value" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assistant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "workspaceId" UUID NOT NULL,
    "modelSlug" TEXT NOT NULL,
    "modelProviderId" UUID NOT NULL,
    "storageProviderType" "StorageProviderType" NOT NULL DEFAULT 'OPENAI',
    "openaiAssistantId" TEXT,
    "openaiAssistantFileSearchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "openaiAssistantCodeInterpreterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Assistant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assistantId" UUID NOT NULL,
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AssistantHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avatar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AvatarType" NOT NULL,
    "assistantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientToolHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ClientToolHandlerType" NOT NULL DEFAULT 'FUNCTION',
    "name" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClientToolHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeInterpreterTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "toolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CodeInterpreterTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputerUseTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "displayHeight" INTEGER NOT NULL DEFAULT 720,
    "displayWidth" INTEGER NOT NULL DEFAULT 1280,
    "environment" "ComputerUseToolEnvironment" NOT NULL DEFAULT 'LINUX',
    "mcpServerId" UUID,
    "toolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ComputerUseTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreateTaskHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyTemplate" TEXT NOT NULL DEFAULT '',
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CreateTaskHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeleteTaskHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyTemplate" TEXT NOT NULL DEFAULT '',
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DeleteTaskHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileSearchTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vectorStoreIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxNumResults" INTEGER NOT NULL DEFAULT 20,
    "toolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FileSearchTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirecrawlHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "FirecrawlHandlerType" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FirecrawlHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Function" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "openapiSpec" JSONB NOT NULL,
    "assistantId" UUID NOT NULL,
    "importOpenApiSchema" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Function_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "HandlerType" NOT NULL,
    "functionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Handler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HttpTransport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mcpServerId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "HttpTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IconAvatar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" "IconAvatarName" NOT NULL,
    "avatarId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "IconAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAvatar" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "avatarId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImageAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageGenerationTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outputFormat" "ImageGenerationToolOutputFormat" NOT NULL DEFAULT 'PNG',
    "partialImages" INTEGER NOT NULL DEFAULT 0,
    "quality" "ImageGenerationToolQuality" NOT NULL DEFAULT 'AUTO',
    "size" "ImageGenerationToolSize" NOT NULL DEFAULT 'AUTO',
    "toolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImageGenerationTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitialMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assistantId" UUID,
    "role" "MessageRole" NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InitialMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "roleType" "UserRoleType" NOT NULL DEFAULT 'ADMIN',
    "createdByUserId" TEXT NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListTasksHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyTemplate" TEXT NOT NULL DEFAULT '',
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ListTasksHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "level" "LogLevel" NOT NULL,
    "requestMethod" "LogRequestMethod" NOT NULL,
    "requestRoute" "LogRequestRoute" NOT NULL,
    "status" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "workspaceId" UUID,
    "assistantId" UUID,
    "threadId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpServer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transportType" "TransportType" NOT NULL DEFAULT 'STDIO',
    "assistantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" JSONB NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'COMPLETED',
    "assistantId" UUID,
    "runId" UUID,
    "completedAt" TIMESTAMPTZ(6),
    "incompleteAt" TIMESTAMPTZ(6),
    "incompleteDetails" JSONB,
    "attachments" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "metadata" JSONB,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelProvider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ModelProviderType" NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "apiKey" TEXT NOT NULL,
    "endpoint" TEXT,
    "apiVersion" TEXT,
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplicateHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ReplicateHandlerType" NOT NULL DEFAULT 'RUN',
    "identifier" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReplicateHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "method" "MethodType" NOT NULL,
    "headers" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RequestHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "status" "RunStatus" NOT NULL,
    "requiredAction" JSONB,
    "lastError" JSONB,
    "expiresAt" INTEGER NOT NULL,
    "startedAt" INTEGER,
    "cancelledAt" INTEGER,
    "failedAt" INTEGER,
    "completedAt" INTEGER,
    "model" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "tools" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "metadata" JSONB,
    "usage" JSONB,
    "truncationStrategy" JSONB NOT NULL DEFAULT '{ "type": "auto" }',
    "responseFormat" JSONB NOT NULL DEFAULT '{ "type": "text" }',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "assistantId" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "type" "RunStepType" NOT NULL,
    "status" "RunStepStatus" NOT NULL,
    "stepDetails" JSONB NOT NULL,
    "lastError" JSONB,
    "expiredAt" INTEGER,
    "cancelledAt" INTEGER,
    "failedAt" INTEGER,
    "completedAt" INTEGER,
    "metadata" JSONB,
    "usage" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SseTransport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mcpServerId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SseTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StdioTransport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mcpServerId" UUID NOT NULL,
    "command" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StdioTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "key" TEXT NOT NULL,
    "qstashMessageId" TEXT,
    "threadId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "openaiThreadId" TEXT,
    "openaiConversationId" TEXT,
    "azureOpenaiConversationId" TEXT,
    "assistantId" UUID NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "ToolType" NOT NULL,
    "assistantId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateTaskHandler" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "keyTemplate" TEXT NOT NULL DEFAULT '',
    "handlerId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UpdateTaskHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "UserRoleType" NOT NULL DEFAULT 'ADMIN',
    "userId" TEXT NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "WebSearchTool" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "toolId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebSearchTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_value_key" ON "ApiKey"("value");

-- CreateIndex
CREATE INDEX "ApiKey_value_idx" ON "ApiKey"("value");

-- CreateIndex
CREATE INDEX "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");

-- CreateIndex
CREATE INDEX "Assistant_workspaceId_idx" ON "Assistant"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantHandler_handlerId_key" ON "AssistantHandler"("handlerId");

-- CreateIndex
CREATE INDEX "AssistantHandler_handlerId_idx" ON "AssistantHandler"("handlerId");

-- CreateIndex
CREATE INDEX "AssistantHandler_assistantId_idx" ON "AssistantHandler"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "Avatar_assistantId_key" ON "Avatar"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientToolHandler_handlerId_key" ON "ClientToolHandler"("handlerId");

-- CreateIndex
CREATE INDEX "ClientToolHandler_handlerId_idx" ON "ClientToolHandler"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeInterpreterTool_toolId_key" ON "CodeInterpreterTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "ComputerUseTool_mcpServerId_key" ON "ComputerUseTool"("mcpServerId");

-- CreateIndex
CREATE UNIQUE INDEX "ComputerUseTool_toolId_key" ON "ComputerUseTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "CreateTaskHandler_handlerId_key" ON "CreateTaskHandler"("handlerId");

-- CreateIndex
CREATE INDEX "CreateTaskHandler_handlerId_idx" ON "CreateTaskHandler"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "DeleteTaskHandler_handlerId_key" ON "DeleteTaskHandler"("handlerId");

-- CreateIndex
CREATE INDEX "DeleteTaskHandler_handlerId_idx" ON "DeleteTaskHandler"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "FileSearchTool_toolId_key" ON "FileSearchTool"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "FirecrawlHandler_handlerId_key" ON "FirecrawlHandler"("handlerId");

-- CreateIndex
CREATE INDEX "FirecrawlHandler_handlerId_idx" ON "FirecrawlHandler"("handlerId");

-- CreateIndex
CREATE INDEX "Function_assistantId_idx" ON "Function"("assistantId");

-- CreateIndex
CREATE UNIQUE INDEX "Handler_functionId_key" ON "Handler"("functionId");

-- CreateIndex
CREATE INDEX "Handler_functionId_idx" ON "Handler"("functionId");

-- CreateIndex
CREATE UNIQUE INDEX "HttpTransport_mcpServerId_key" ON "HttpTransport"("mcpServerId");

-- CreateIndex
CREATE INDEX "HttpTransport_mcpServerId_idx" ON "HttpTransport"("mcpServerId");

-- CreateIndex
CREATE UNIQUE INDEX "IconAvatar_avatarId_key" ON "IconAvatar"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAvatar_avatarId_key" ON "ImageAvatar"("avatarId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageGenerationTool_toolId_key" ON "ImageGenerationTool"("toolId");

-- CreateIndex
CREATE INDEX "InitialMessage_assistantId_idx" ON "InitialMessage"("assistantId");

-- CreateIndex
CREATE INDEX "InitialMessage_orderNumber_idx" ON "InitialMessage"("orderNumber");

-- CreateIndex
CREATE INDEX "Invitation_createdByUserId_idx" ON "Invitation"("createdByUserId");

-- CreateIndex
CREATE INDEX "Invitation_workspaceId_idx" ON "Invitation"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_workspaceId_email_key" ON "Invitation"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ListTasksHandler_handlerId_key" ON "ListTasksHandler"("handlerId");

-- CreateIndex
CREATE INDEX "ListTasksHandler_handlerId_idx" ON "ListTasksHandler"("handlerId");

-- CreateIndex
CREATE INDEX "Log_workspaceId_idx" ON "Log"("workspaceId");

-- CreateIndex
CREATE INDEX "Log_assistantId_idx" ON "Log"("assistantId");

-- CreateIndex
CREATE INDEX "Log_threadId_idx" ON "Log"("threadId");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "McpServer_assistantId_idx" ON "McpServer"("assistantId");

-- CreateIndex
CREATE INDEX "Message_threadId_idx" ON "Message"("threadId");

-- CreateIndex
CREATE INDEX "Message_assistantId_idx" ON "Message"("assistantId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_runId_idx" ON "Message"("runId");

-- CreateIndex
CREATE INDEX "ModelProvider_workspaceId_idx" ON "ModelProvider"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplicateHandler_handlerId_key" ON "ReplicateHandler"("handlerId");

-- CreateIndex
CREATE INDEX "ReplicateHandler_handlerId_idx" ON "ReplicateHandler"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestHandler_handlerId_key" ON "RequestHandler"("handlerId");

-- CreateIndex
CREATE INDEX "RequestHandler_handlerId_idx" ON "RequestHandler"("handlerId");

-- CreateIndex
CREATE INDEX "Run_assistantId_idx" ON "Run"("assistantId");

-- CreateIndex
CREATE INDEX "Run_threadId_idx" ON "Run"("threadId");

-- CreateIndex
CREATE INDEX "RunStep_threadId_runId_type_status_idx" ON "RunStep"("threadId", "runId", "type", "status");

-- CreateIndex
CREATE INDEX "RunStep_createdAt_idx" ON "RunStep"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "RunStep_assistantId_idx" ON "RunStep"("assistantId");

-- CreateIndex
CREATE INDEX "RunStep_runId_idx" ON "RunStep"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "SseTransport_mcpServerId_key" ON "SseTransport"("mcpServerId");

-- CreateIndex
CREATE INDEX "SseTransport_mcpServerId_idx" ON "SseTransport"("mcpServerId");

-- CreateIndex
CREATE UNIQUE INDEX "StdioTransport_mcpServerId_key" ON "StdioTransport"("mcpServerId");

-- CreateIndex
CREATE INDEX "StdioTransport_mcpServerId_idx" ON "StdioTransport"("mcpServerId");

-- CreateIndex
CREATE INDEX "Task_threadId_idx" ON "Task"("threadId");

-- CreateIndex
CREATE INDEX "Thread_assistantId_idx" ON "Thread"("assistantId");

-- CreateIndex
CREATE INDEX "Thread_createdAt_idx" ON "Thread"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UpdateTaskHandler_handlerId_key" ON "UpdateTaskHandler"("handlerId");

-- CreateIndex
CREATE INDEX "UpdateTaskHandler_handlerId_idx" ON "UpdateTaskHandler"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_workspaceId_idx" ON "UserRole"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_workspaceId_userId_key" ON "UserRole"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "WebSearchTool_toolId_key" ON "WebSearchTool"("toolId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_modelProviderId_fkey" FOREIGN KEY ("modelProviderId") REFERENCES "ModelProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantHandler" ADD CONSTRAINT "AssistantHandler_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantHandler" ADD CONSTRAINT "AssistantHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avatar" ADD CONSTRAINT "Avatar_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientToolHandler" ADD CONSTRAINT "ClientToolHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeInterpreterTool" ADD CONSTRAINT "CodeInterpreterTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputerUseTool" ADD CONSTRAINT "ComputerUseTool_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputerUseTool" ADD CONSTRAINT "ComputerUseTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreateTaskHandler" ADD CONSTRAINT "CreateTaskHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeleteTaskHandler" ADD CONSTRAINT "DeleteTaskHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSearchTool" ADD CONSTRAINT "FileSearchTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirecrawlHandler" ADD CONSTRAINT "FirecrawlHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Function" ADD CONSTRAINT "Function_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handler" ADD CONSTRAINT "Handler_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HttpTransport" ADD CONSTRAINT "HttpTransport_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IconAvatar" ADD CONSTRAINT "IconAvatar_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAvatar" ADD CONSTRAINT "ImageAvatar_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageGenerationTool" ADD CONSTRAINT "ImageGenerationTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitialMessage" ADD CONSTRAINT "InitialMessage_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListTasksHandler" ADD CONSTRAINT "ListTasksHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelProvider" ADD CONSTRAINT "ModelProvider_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplicateHandler" ADD CONSTRAINT "ReplicateHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestHandler" ADD CONSTRAINT "RequestHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SseTransport" ADD CONSTRAINT "SseTransport_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StdioTransport" ADD CONSTRAINT "StdioTransport_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateTaskHandler" ADD CONSTRAINT "UpdateTaskHandler_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "Handler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebSearchTool" ADD CONSTRAINT "WebSearchTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
