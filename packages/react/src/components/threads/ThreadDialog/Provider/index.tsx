import { useState } from 'react'
import { ThreadDialogContext } from '@/contexts/threads/ThreadDialogContext'
import { useThreadDialogContext } from '@/hooks/threads/useThreadDialogContext'

type Args = {
  children: React.ReactNode
}

export const Provider = ({
  children,
}: Args) => {
  const threadDialogContext = useThreadDialogContext()
  const [isOpen, setIsOpen] = useState<boolean>(threadDialogContext.isOpen)

  return (
    <ThreadDialogContext.Provider
      value={{
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </ThreadDialogContext.Provider>
  )
}
