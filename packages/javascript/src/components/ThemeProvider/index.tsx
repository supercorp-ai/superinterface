import {
  useThreadContext,
} from '@superinterface/react'
import { Theme } from '@radix-ui/themes'
import { useAssistant } from '@/hooks/assistants/useAssistant'

type Args = {
  children: React.ReactNode
}

export const ThemeProvider = ({
  children,
}: Args) => {
  const threadContext = useThreadContext()
  const { assistant } = useAssistant({
    assistantId: threadContext.variables.assistantId,
  })
  console.log({ assistant })

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
    >
      {children}
    </Theme>
  )
}
