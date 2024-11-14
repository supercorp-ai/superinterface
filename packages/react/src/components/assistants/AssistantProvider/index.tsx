import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import { AssistantAvatarContext } from '@/contexts/assistants/AssistantAvatarContext'
import { AssistantNameContext } from '@/contexts/assistants/AssistantNameContext'
import { useAssistant } from '@/hooks/assistants/useAssistant'
import { Avatar } from '@/components/avatars/Avatar'

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

  return (
    <AssistantNameContext.Provider value={assistant?.name ?? ''}>
      <AssistantAvatarContext.Provider
        value={<Avatar avatar={assistant?.avatar} />}
      >
        {children}
      </AssistantAvatarContext.Provider>
    </AssistantNameContext.Provider>
  )
}
