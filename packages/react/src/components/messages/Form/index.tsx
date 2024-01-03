import {
  UseInfiniteQueryOptions,
  UseMutationOptions,
  InfiniteData,
} from '@tanstack/react-query'
import {
  Container,
  Flex,
  Text,
} from '@radix-ui/themes'
import { useMemo } from 'react'
import { Submit } from './Submit'
import { useIsRunActive } from '@/hooks/runs/useIsRunActive'
import { useForm, SubmitHandler } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { TextareaBase } from '@/components/textareas/TextareaBase'
import { useLatestMessage } from '@/hooks/messages/useLatestMessage'
import { useCreateMessage } from '@/hooks/messages/useCreateMessage'
import { Examples } from './Examples'
import { MessagesPage, RunsPage, Message } from '@/types'

export const schema = z.object({
  content: z.string().min(1).max(300),
})

type Args = {
  messagesQueryOptions: UseInfiniteQueryOptions<InfiniteData<MessagesPage>>
  runsQueryOptions: UseInfiniteQueryOptions<InfiniteData<RunsPage>>
  createMessageMutationOptions: UseMutationOptions<{ message: Message }>
}

type Inputs = {
  content: string
}

export const Form = ({
  messagesQueryOptions,
  runsQueryOptions,
  createMessageMutationOptions,
}: Args) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Inputs>({
    resolver: zodResolver(schema),
  })

  const { isRunActive } = useIsRunActive({
    messagesQueryOptions,
    runsQueryOptions,
  })

  const isLoading = useMemo(() => (
    isRunActive || isSubmitting
  ), [
    isRunActive,
    isSubmitting,
  ])

  const {
    createMessage,
  } = useCreateMessage({
    createMessageMutationOptions,
  })

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    reset()
    // @ts-ignore-next-line
    await createMessage({
      content: data.content,
    })
  }

  const { latestMessage } = useLatestMessage({
    messagesQueryOptions,
  })

  const isDisabled = useMemo(() => (
    // @ts-ignore-next-line
    latestMessage?.metadata?.isBlocking
  ), [latestMessage])

  return (
    <Container
      size="2"
      px="2"
      grow="0"
    >
      {!isDisabled && <Examples
        createMessageMutationOptions={createMessageMutationOptions}
        messagesQueryOptions={messagesQueryOptions}
        runsQueryOptions={runsQueryOptions}
        latestMessage={latestMessage}
        isLoading={isLoading}
      />}
      <Flex
        direction="column"
        shrink="0"
      >
        <Flex
          direction="column"
          shrink="0"
          className="bg-gray-1"
          pb="4"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
          >
            <Flex
              className={`rounded-3 border-gray-5 border border-solid ${errors.content ? 'border-red-9 bg-red-2' : ''}`}
              p="2"
              pl="4"
            >
              <Text
                size="2"
                className="grow"
              >
                <Flex
                  grow="1"
                  direction="column"
                >
                  <TextareaBase
                    minRows={1}
                    placeholder="Message Superdomain..."
                    disabled={isLoading || isDisabled}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(onSubmit)()
                      }
                    }}
                    {...register('content')}
                  />
                </Flex>
              </Text>

              <Flex
                shrink="0"
                align="end"
              >
                <Submit
                  isLoading={isLoading}
                  isDisabled={isDisabled}
                />
              </Flex>
            </Flex>
          </form>
        </Flex>
      </Flex>
    </Container>
  )
}
