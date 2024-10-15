import { useMemo } from 'react'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AssistantAvatarContext } from '@/contexts/assistants/AssistantAvatarContext'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { MarkdownProvider } from '@/components/markdown/MarkdownProvider'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'
import { useAssistant } from '@/hooks/assistants/useAssistant'
import { Avatar } from '@/components/avatars/Avatar'
import { Theme } from '@radix-ui/themes'
import { Code } from './Code'

type Args = {
  children: React.ReactNode
}

export const AssistantProvider = ({
  children,
}: Args) => {
  const superinterfaceContext = useSuperinterfaceContext()
  const { assistant } = useAssistant({
    assistantId: superinterfaceContext.variables.assistantId,
  })

  const markdownContext = useMarkdownContext()

  const components = useMemo(() => ({
    code: (props:  JSX.IntrinsicElements['code']) => (
      // @ts-ignore-next-line
      <Code
        {...props}
        markdownContext={markdownContext}
      />
    ),
  }), [markdownContext])

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
      <AssistantNameContext.Provider value={assistant.name}>
        <AssistantAvatarContext.Provider
          value={
            <Avatar
              avatar={assistant.avatar}
            />
          }
        >
          <MarkdownProvider
            // @ts-ignore-next-line
            components={components}
          >
            {children}
          </MarkdownProvider>
        </AssistantAvatarContext.Provider>
      </AssistantNameContext.Provider>
    </Theme>
  )
}
