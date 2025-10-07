import type { themePropDefs } from '@radix-ui/themes/props'

export const serializeAccentColor = ({
  accentColor,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accentColor: any
}) =>
  accentColor.toLowerCase() as (typeof themePropDefs.accentColor.values)[number]
