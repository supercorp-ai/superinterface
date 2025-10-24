import type { themePropDefs } from '@radix-ui/themes/props'

const scalingMap = {
  SCALING_90: '90%',
  SCALING_95: '95%',
  SCALING_100: '100%',
  SCALING_105: '105%',
  SCALING_110: '110%',
} as const

export const serializeScaling = ({ scaling }: { scaling: string }) =>
  scalingMap[
    scaling as keyof typeof scalingMap
  ] as (typeof themePropDefs.scaling.values)[number]
