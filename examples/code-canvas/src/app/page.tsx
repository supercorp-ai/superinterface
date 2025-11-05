'use client'

import { useState, useEffect } from 'react'
import {
  SuperinterfaceProvider,
  Thread,
  AssistantProvider,
} from '@superinterface/react'
import {
  Theme,
  Flex,
  Grid,
  SegmentedControl,
  TextArea,
  Card,
} from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
    },
  },
})

export default function Page() {
  const [activeTab, setActiveTab] = useState<'thread' | 'code' | 'preview'>(
    'thread',
  )
  const [code, setCode] = useState(`<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: sans-serif;
      }
    </style>
  </head>
  <body>
    Welcome to AI code canvas
  </body>
</html>`)

  useEffect(() => {
    window.setCode = ({ code }: { code: string }) => setCode(code)
  }, [setCode])

  useEffect(() => {
    window.getCode = () => code
  }, [code])

  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="iris"
        grayColor="gray"
        appearance="light"
        radius="medium"
        scaling="100%"
      >
        <Flex
          direction="column"
          height="100vh"
        >
          <Flex
            display={{
              initial: 'flex',
              md: 'none',
            }}
            justify="center"
            pt="5"
          >
            <SegmentedControl.Root
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as 'thread' | 'code' | 'preview')
              }
            >
              <SegmentedControl.Item value="thread">
                Thread
              </SegmentedControl.Item>

              <SegmentedControl.Item value="code">Code</SegmentedControl.Item>
              <SegmentedControl.Item value="preview">
                Preview
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>

          <Grid
            columns={{
              initial: '1fr',
              md: '1fr 1fr',
            }}
            flexGrow="1"
          >
            <Flex
              display={{
                initial: activeTab === 'thread' ? 'flex' : 'none',
                md: 'flex',
              }}
              p="5"
              flexGrow="1"
              flexShrink="1"
              height={{
                initial: 'calc(100dvh - 56px)',
                md: '100dvh',
              }}
            >
              <SuperinterfaceProvider
                variables={{
                  publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
                  assistantId: '5e58a546-b526-4797-aa34-22a0024d54b0',
                }}
              >
                <AssistantProvider>
                  <Thread />
                </AssistantProvider>
              </SuperinterfaceProvider>
            </Flex>

            <Flex
              direction="column"
              flexGrow="1"
            >
              <Flex
                display={{
                  initial: 'none',
                  md: 'flex',
                }}
                pt="5"
                px="5"
              >
                <SegmentedControl.Root
                  value={activeTab}
                  onValueChange={(value) =>
                    setActiveTab(value as 'thread' | 'code' | 'preview')
                  }
                >
                  <SegmentedControl.Item value="code">
                    Code
                  </SegmentedControl.Item>
                  <SegmentedControl.Item value="preview">
                    Preview
                  </SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>

              <Flex
                display={activeTab === 'code' ? 'flex' : 'none'}
                direction="column"
                flexGrow="1"
                p="5"
              >
                <TextArea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    fontFamily: 'var(--code-font-family)',
                    flexGrow: 1,
                  }}
                />
              </Flex>

              <Flex
                display={activeTab === 'preview' ? 'flex' : 'none'}
                flexGrow="1"
                p="5"
              >
                <Card
                  style={{
                    flexGrow: 1,
                  }}
                >
                  <iframe
                    srcDoc={code}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                  />
                </Card>
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Theme>
    </QueryClientProvider>
  )
}

declare global {
  interface Window {
    setCode: ({ code }: { code: string }) => void
    getCode: () => string
  }
}
