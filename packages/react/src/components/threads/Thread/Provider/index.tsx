'use client'

import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import type { Args as SuperinterfaceProviderArgs } from '@/components/core/SuperinterfaceProvider'
import { PollingProvider } from '@/components/runs/PollingProvider'

export type Args = SuperinterfaceProviderArgs

export const Provider = (args: Args) => (
  <PollingProvider>
    <SuperinterfaceProvider {...args} />
  </PollingProvider>
)
