import { Client } from '@upstash/workflow'

export const upstashWorkflowClient = new Client({
  token: process.env.QSTASH_TOKEN,
})
