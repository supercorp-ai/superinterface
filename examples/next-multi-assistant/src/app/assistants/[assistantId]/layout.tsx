'use client'

import { useState } from 'react'
import { Flex, Theme } from '@radix-ui/themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuperinterfaceProvider } from '@superinterface/react'
import { Menu } from './Menu'

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 10000,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SuperinterfaceProvider
        variables={{
          publicApiKey: '37245be8-902a-440e-aaae-c56151fe8acc',
        }}
      >
        <Theme
          accentColor="mint"
          grayColor="gray"
          radius="medium"
          appearance="light"
          scaling="100%"
          panelBackground="solid"
          hasBackground={false}
        >
          <Flex
            height="100vh"
            flexGrow="1"
          >
            <Menu />

            {children}
          </Flex>
        </Theme>
      </SuperinterfaceProvider>
    </QueryClientProvider>
  )
}
