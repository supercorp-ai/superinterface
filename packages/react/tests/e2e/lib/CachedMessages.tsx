import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSuperinterfaceContext } from '@/hooks/core/useSuperinterfaceContext'
import type { MessagesPage } from '@/types'
import { messageTexts } from './messageTexts'

// Shows, on clicking "Read cache", the cached messages of the provider's
// thread without subscribing to (and so fetching) them.
export const CachedMessages = () => {
  const queryClient = useQueryClient()
  const { variables } = useSuperinterfaceContext()
  const [texts, setTexts] = useState<string[] | null>(null)

  const read = () => {
    const data = queryClient.getQueryData<{ pages: MessagesPage[] }>([
      'messages',
      variables,
    ])
    setTexts(
      messageTexts({
        messages: data?.pages.flatMap((page) => page.data) ?? [],
      }),
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={read}
      >
        Read cache
      </button>
      <output data-testid="cached-messages">{texts?.join(' / ')}</output>
    </>
  )
}
