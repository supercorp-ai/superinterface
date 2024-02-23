import {
  useSuperinterfaceContext,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import { useAssistant } from '@/hooks/assistants/useAssistant'

type Args = {
  children: React.ReactNode
}

export const ThemeProvider = ({
  children,
}: Args) => {
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
    >
      {children}
    </Theme>
  )
}
