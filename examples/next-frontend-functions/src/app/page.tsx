'use client'

import {
  SuperinterfaceProvider,
  ThreadDialog,
  AssistantProvider,
  MarkdownProvider,
} from '@superinterface/react'
import { Theme, Card, Flex, Text, Button, TextArea } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState, ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

interface EmailDraftProps {
  subject?: string
  children: ReactNode
}

const EmailDraft = ({ subject = '', children }: EmailDraftProps) => {
  const [emailSubject, setEmailSubject] = useState(subject)
  const [emailBody, setEmailBody] = useState(children?.toString() || '')

  const handleSend = () => {
    // Here you would typically integrate with your email sending service
    // For now, we'll just open the default mail client
    window.open(`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`)
  }

  return (
    <Card style={{ width: '100%', marginBottom: '16px' }}>
      <Flex direction="column" gap="2">
        <TextArea
          placeholder="Subject"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          style={{ minHeight: '40px' }}
        />
        <TextArea
          placeholder="Email body"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          style={{ minHeight: '150px' }}
        />
        <Flex justify="end">
          <Button onClick={handleSend}>Send Email</Button>
        </Flex>
      </Flex>
    </Card>
  )
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="blue"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
        panelBackground="solid"
      >
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '37245be8-902a-440e-aaae-c56151fe8acc',
            assistantId: 'cbe898ee-d9fa-4515-9bcc-2f3cd95fb088',
          }}
        >
          <AssistantProvider>
            <MarkdownProvider components={{ EmailDraft }}>
              <ThreadDialog />
            </MarkdownProvider>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
