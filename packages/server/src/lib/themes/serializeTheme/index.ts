import { themePropDefs } from '@radix-ui/themes/props'
import { serializeAccentColor } from '@/lib/themes/serializeAccentColor'
import { serializeScaling } from './serializeScaling'

type Args = {
  theme: {
    accentColor: string
    grayColor: string
    appearance: string
    radius: string
    scaling: string
  }
}

export const serializeTheme = ({ theme }: Args) => ({
  accentColor: serializeAccentColor({ accentColor: theme.accentColor }),
  grayColor:
    theme.grayColor.toLowerCase() as (typeof themePropDefs.grayColor.values)[number],
  appearance:
    theme.appearance.toLowerCase() as (typeof themePropDefs.appearance.values)[number],
  radius:
    theme.radius.toLowerCase() as (typeof themePropDefs.radius.values)[number],
  scaling: serializeScaling({ scaling: theme.scaling }),
  panelBackground: 'solid' as const,
})
