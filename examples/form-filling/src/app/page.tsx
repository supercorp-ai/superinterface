'use client'

import { useState, useEffect } from 'react'
import {
  SuperinterfaceProvider,
  ThreadDialog,
  AssistantProvider,
} from '@superinterface/react'
import { Theme, Flex, Button, TextField } from '@radix-ui/themes'
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
  const [name, setName] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    window.setName = ({ name }: { name: string }) => setName(name)
  }, [setName])

  useEffect(() => {
    window.setCity = ({ city }: { city: string }) => setCity(city)
  }, [setCity])

  return (
    <QueryClientProvider client={queryClient}>
      <Theme
        accentColor="plum"
        grayColor="gray"
        appearance="dark"
        radius="medium"
        scaling="100%"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            alert(`Name: ${name || '-'}\nCity: ${city || '-'}`)
          }}
        >
          <Flex
            align="center"
            justify="center"
            minHeight="100vh"
          >
            <Flex
              direction="column"
              gap="2"
              flexGrow="1"
              maxWidth="300px"
              p="3"
            >
              <TextField.Root
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />

              <TextField.Root
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter your city"
              />

              <Button>Submit</Button>
            </Flex>
          </Flex>
        </form>
        <SuperinterfaceProvider
          variables={{
            publicApiKey: '18d58cdd-96bc-4d01-ab21-1a891a4fd49e',
            assistantId: '3560868b-25fd-4bbf-b331-bc04b75c8cf0',
          }}
        >
          <AssistantProvider>
            <ThreadDialog />
          </AssistantProvider>
        </SuperinterfaceProvider>
      </Theme>
    </QueryClientProvider>
  )
}

declare global {
  interface Window {
    setName: ({ name }: { name: string }) => void
    setCity: ({ city }: { city: string }) => void
  }
}
