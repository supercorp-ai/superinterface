import { useSuperinterfaceContext, useAssistant } from '@superinterface/react'
import { Theme, type ThemeProps } from '@radix-ui/themes'
import { type ComponentType, type ReactNode } from 'react'

// Radix UI still exports `Theme` as a `forwardRef` exotic component, which
// React 19's JSX type definitions no longer accept directly. Casting through a
// standard `ComponentType` preserves the library-provided `ThemeProps` while we
// wait for an upstream fix.
const RadixTheme = Theme as unknown as ComponentType<ThemeProps>

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const { assistant } = useAssistant({
    assistantId: superinterfaceContext.variables.assistantId,
  })

  if (!assistant) {
    return null
  }

  return (
    <RadixTheme
      accentColor={assistant.theme.accentColor}
      grayColor={assistant.theme.grayColor}
      radius={assistant.theme.radius}
      appearance={assistant.theme.appearance}
      scaling={assistant.theme.scaling}
      panelBackground="solid"
      hasBackground={false}
    >
      {children}
    </RadixTheme>
  )
}
