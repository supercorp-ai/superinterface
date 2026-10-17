import { ClientSecretCredential } from '@azure/identity'

// Integration tests against real Azure need working credentials. Returns why
// they can't run (missing or rejected credentials), or undefined if they can.
export const azureCredentialsSkipReason = async () => {
  const {
    TEST_AZURE_TENANT_ID: tenantId,
    TEST_AZURE_CLIENT_ID: clientId,
    TEST_AZURE_CLIENT_SECRET: clientSecret,
    TEST_AZURE_AI_PROJECT_ENDPOINT: endpoint,
  } = process.env

  if (!tenantId || !clientId || !clientSecret || !endpoint) {
    return 'Azure test credentials are not configured'
  }

  try {
    await new ClientSecretCredential(tenantId, clientId, clientSecret).getToken(
      'https://ai.azure.com/.default',
    )
    return undefined
  } catch (error) {
    const { message } = error as Error
    // Entra ID errors carry trace ids; the AADSTS sentence is the useful part.
    const reason = message.match(/AADSTS\d+:[^.]*\./)?.[0] ?? message
    return `Azure test credentials are not usable: ${reason.slice(0, 200)}`
  }
}
