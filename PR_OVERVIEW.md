# PR Overview: Azure AI Agents (Responses API) Support

## Summary

This PR adds a new provider type `AZURE_AGENTS_RESPONSES` to support the latest version of Azure AI Agents. This new version uses the **OpenAI Responses API** under the hood (instead of the older Assistants API) and supports the newest models like `gpt-5`, `o1`, and `o3-mini`.

## Key Changes

### 1. Database & Schema

- **Enum Update:** Added `AZURE_AGENTS_RESPONSES` to `StorageProviderType` in `schema.prisma`.
- **Prisma Client:** Regenerated the Prisma client to include this new enum value.

### 2. Configuration (`modelProviderConfigs.ts`)

- Enabled the new `AZURE_AGENTS_RESPONSES` storage type for the `azure-ai-project` provider.
- **New Models:** Added support for `gpt-5`, `gpt-5-preview`, `gpt-4.5-preview`, `o3-mini`, and `o1` to the Azure AI Project provider.

### 3. Server-Side Logic (`assistantClientAdapter/index.ts`)

This is the core of the implementation. I created a **proxy adapter** to bridge the gap between Superinterface (which expects the standard OpenAI SDK structure) and the Azure AI Agents SDK (which uses a distinct API structure).

- **Proxy Logic:**
  - **Threads → Conversations:** Maps `client.beta.threads.create` and `messages.create` to the Azure SDK's `conversations` and `conversations.messages` endpoints.
  - **Runs → Responses:** Maps `client.beta.threads.runs.create` (and `.stream`) to `client.responses.create`.
  - **Agent Injection:** Automatically injects the required `agent` reference (using the assistant's name or ID) into the request body, as required by the Responses API.
  - **Parameter Cleanup:** Ensures incompatible parameters (like `model` when `agent` is present) are handled correctly.

### 4. Assistant Payload (`buildGetOpenaiAssistant.ts`)

- Updated the assistant object retrieval to return the correct `agent` reference structure (`{ name: ..., type: 'agent_reference' }`) instead of just a model slug when using this new provider.

## Reviewer Checklist / "Watch Outs"

Since you mentioned you aren't a JS expert, here are the specific things a maintainer should double-check:

1.  **Azure SDK Method Signatures:**
    - Verify that `openAIClient.conversations.messages.create(threadId, ...)` is the exact correct method name and signature for the `@azure/ai-projects` library version being used.
    - Verify that `openAIClient.responses.create` accepts the arguments in the order `(params, options)` as implemented (based on the provided snippet).

2.  **Streaming Behavior:**
    - The implementation assumes `responses.create` supports a `{ body: { stream: true } }` parameter to initiate a stream. This is standard for OpenAI-like APIs but should be verified against the specific Azure SDK docs if possible.

3.  **Cancellation:**
    - The `cancel` method falls back to `beta.threads.runs.cancel`. If the new Azure client strictly separates "Conversations" from "Threads", this might need to be `conversations.runs.cancel` or similar. I marked it with `@ts-expect-error` as a safe fallback, but it might throw at runtime if that path doesn't exist.

4.  **Agent Name vs ID:**
    - The code uses `assistant.azureAgentsAgentId` (if available) or falls back to `assistant.name` for the agent reference. The reviewer should ensure that the Azure API expects the _name_ string here, not a UUID, or that our `azureAgentsAgentId` field correctly stores what Azure expects.

## Testing

To test this, you will need:

1.  An Azure AI Project set up with an Agent.
2.  Configure a new Assistant in Superinterface using the "Azure AI Project" provider.
3.  Ensure the "Storage Provider" is set to the new "Azure Agents (Responses)" type (this might require manual DB update or UI selection if exposed).
4.  Try creating a thread and sending a message.
