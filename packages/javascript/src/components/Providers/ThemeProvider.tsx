import {
  useSuperinterfaceContext,
  useAssistant,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const superinterfaceContext = useSuperinterfaceContext()

  const { assistant } = useAssistant({
    assistantId: superinterfaceContext.variables.assistantId,
  })

  if (!assistant) {
    return null
  }

  return (
    <Theme
      accentColor={assistant.theme.accentColor}
      grayColor={assistant.theme.grayColor}
      radius={assistant.theme.radius}
      appearance={assistant.theme.appearance}
      scaling={assistant.theme.scaling}
      panelBackground="solid"
      hasBackground={false}
    >
      {children}
    </Theme>
  )
}
