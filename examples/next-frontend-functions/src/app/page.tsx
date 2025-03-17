'use client'

import {
  ComponentsProvider,
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
  MarkdownProvider,
  useCreateMessage,
  useSuperinterfaceContext,
} from '@superinterface/react'
import '@radix-ui/themes/styles.css'
import { EnvelopeOpenIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { Theme, Card, Flex, Text, Button, TextArea, Grid, Link } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState, ReactNode, useMemo } from 'react'

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

const Input = (props: any) => {
  console.log(props)
  return 'Input'
}

const Form = (props: any) => {
  return (
    <>
      {props.children}
    </>
  )
}

interface GmailAuthenticationProps {
  authUrl: string
}

const GmailAuthentication: React.FC<GmailAuthenticationProps> = ({
  authUrl,
}) => {
  const { createMessage } = useCreateMessage()
  const { variables } = useSuperinterfaceContext()

  const processedAuthUrl = useMemo(() => {
    try {
      const url = new URL(authUrl)
      // Create a state object using the current context variables
      const stateObject = { variables }
      console.log({ variables, authUrl })
      // Encode the state object as a query parameter
      const encodedState = encodeURIComponent(JSON.stringify(stateObject))
      // Add the state parameter to the URL
      url.searchParams.set('state', encodedState)
      return url.toString()
    } catch (error) {
      console.error('Error processing auth URL:', error)
      return authUrl
    }
  }, [authUrl, variables])

  const handleDone = () => {
    createMessage({ content: 'Done.' })
  }

  return (
    <Card style={{ width: '100%', maxWidth: '400px' }}>
      <Flex
        direction="column"
        gap="4"
        p="4"
      >
        <Flex
          direction="column"
          align="center"
          gap="2"
        >
          <EnvelopeOpenIcon
            width="48"
            height="48"
            color="var(--accent-9)"
          />
          <Text
            size="4"
            weight="bold"
            align="center"
          >
            Gmail Authentication
          </Text>
          <Text
            size="2"
            color="gray"
            align="center"
          >
            Authenticate your Gmail to allow the assistant to read and send
            emails on your behalf.
          </Text>
        </Flex>

        <Grid
          columns="1"
          gap="3"
          width="100%"
        >
          <Link
            href={processedAuthUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Button
              variant="solid"
              style={{ width: '100%' }}
            >
              Authenticate
              <ExternalLinkIcon />
            </Button>
          </Link>
          <Button
            variant="soft"
            onClick={handleDone}
            style={{ width: '100%' }}
          >
            Done
          </Button>
        </Grid>
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
        style={{
          height: '100dvh',
          display: 'flex',
        }}
      >
        <SuperinterfaceProvider
          variables={{
            userId: 'cm791wwu40000l403mbggcasi',
          }}
        >
          <AssistantProvider>
            <ComponentsProvider
              components={{
                StartingToolCalls: () => <div>Starting tool calls</div>,
              }}
            >
              <MarkdownProvider components={{ EmailDraft, Input, Form, GmailAuthentication }}>
                <Thread />
              </MarkdownProvider>
            </ComponentsProvider>
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}
