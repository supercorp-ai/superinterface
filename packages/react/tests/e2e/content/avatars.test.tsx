import { afterEach, beforeEach, describe, expect, inject, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Theme } from '@radix-ui/themes'
import { LightningBoltIcon, RocketIcon } from '@radix-ui/react-icons'
import { Thread } from '@/components/threads/Thread'
import { Avatar } from '@/components/avatars/Avatar'
import { MessageGroup } from '@/components/messageGroups/MessageGroup'
import { SuperinterfaceProvider } from '@/components/core/SuperinterfaceProvider'
import { AvatarType, IconAvatarName } from '@/enums'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { createTestAssistant } from '../lib/createTestAssistant'
import { emulateImageLoading } from '../lib/emulateImageLoading'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { setAssistantAvatar } from '../lib/setAssistantAvatar'
import { submitThreadMessage } from '../lib/submitThreadMessage'

const iconPath = ({ icon }: { icon: React.ReactElement }) =>
  new DOMParser()
    .parseFromString(renderToStaticMarkup(icon), 'image/svg+xml')
    .querySelector('path')!
    .getAttribute('d')

describe('assistant avatars', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>
  let images: ReturnType<typeof emulateImageLoading>

  beforeEach(() => {
    images = emulateImageLoading()
  })

  afterEach(async () => {
    cleanup()
    images.restore()
    await fakeLlm.close()
  })

  // Renders a conversation with an assistant whose avatar is set by
  // `setAvatar`, and returns the avatar next to the assistant's reply.
  const renderAssistantAvatar = async ({
    setAvatar = () => {},
  }: {
    setAvatar?: (args: { assistantId: string }) => void
  } = {}) => {
    fakeLlm = await startFakeLlm({ replies: [{ content: 'Hello there.' }] })
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })
    setAvatar({ assistantId: assistant.id })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <Thread />,
    })

    await submitThreadMessage({ content: 'Hi' })
    await screen.findByText('Hello there.', {}, { timeout: 15_000 })

    return screen
      .getByText('E2E Assistant', { selector: 'span' })
      .closest('.rt-Container')!
      .querySelector('.rt-AvatarRoot')!
  }

  it('shows an empty avatar until the assistant loads', async () => {
    fakeLlm = await startFakeLlm()
    const { assistant, publicKey } = await createTestAssistant({
      llmBaseUrl: fakeLlm.baseURL,
    })

    const { container } = renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: <MessageGroup.AssistantAvatar />,
    })

    const avatar = () => container.querySelector('.rt-AvatarRoot')!
    expect(avatar().textContent).toBe('')
    expect(avatar().querySelector('svg')).toBeNull()
    await waitFor(() =>
      expect(avatar().querySelector('path')?.getAttribute('d')).toBe(
        iconPath({ icon: <LightningBoltIcon /> }),
      ),
    )
  }, 30_000)

  it('shows an optimized image avatar from the server', async () => {
    const avatar = await renderAssistantAvatar({
      setAvatar: ({ assistantId }) =>
        setAssistantAvatar({
          assistantId,
          type: 'IMAGE',
          imageUrl: 'https://cdn.example.com/bot.png',
        }),
    })

    const { baseUrl } = inject('testServer')
    await waitFor(() =>
      expect(avatar.querySelector('img')?.getAttribute('src')).toBe(
        `${baseUrl}/_next/image?url=${encodeURIComponent('https://cdn.example.com/bot.png')}&w=48&q=95`,
      ),
    )
  }, 30_000)

  it('shows an svg image avatar as it is', async () => {
    const avatar = await renderAssistantAvatar({
      setAvatar: ({ assistantId }) =>
        setAssistantAvatar({
          assistantId,
          type: 'IMAGE',
          imageUrl: 'https://cdn.example.com/bot.svg',
        }),
    })

    await waitFor(() =>
      expect(avatar.querySelector('img')?.getAttribute('src')).toBe(
        'https://cdn.example.com/bot.svg',
      ),
    )
  }, 30_000)

  it('shows an icon avatar', async () => {
    const avatar = await renderAssistantAvatar({
      setAvatar: ({ assistantId }) =>
        setAssistantAvatar({ assistantId, type: 'ICON', iconName: 'ROCKET' }),
    })

    await waitFor(() =>
      expect(avatar.querySelector('path')?.getAttribute('d')).toBe(
        iconPath({ icon: <RocketIcon /> }),
      ),
    )
  }, 30_000)

  it('shows the lightning bolt icon by default', async () => {
    const avatar = await renderAssistantAvatar()

    await waitFor(() =>
      expect(avatar.querySelector('path')?.getAttribute('d')).toBe(
        iconPath({ icon: <LightningBoltIcon /> }),
      ),
    )
  }, 30_000)

  it.each([
    { name: 'an image avatar without an image', type: 'IMAGE' as const },
    { name: 'an icon avatar without an icon', type: 'ICON' as const },
    { name: 'an emoji avatar', type: 'EMOJI' as const },
    {
      name: 'an image avatar with an empty url',
      type: 'IMAGE' as const,
      imageUrl: '',
    },
  ])(
    'shows an empty avatar for $name',
    async ({ type, imageUrl }) => {
      const avatar = await renderAssistantAvatar({
        setAvatar: ({ assistantId }) =>
          setAssistantAvatar({ assistantId, type, imageUrl }),
      })

      // The assistant (named next to its avatar) has loaded by now.
      expect(avatar.querySelector('img, svg')).toBeNull()
      expect(avatar.textContent).toBe('')
    },
    30_000,
  )
})

describe('Avatar', () => {
  let images: ReturnType<typeof emulateImageLoading>

  beforeEach(() => {
    images = emulateImageLoading()
  })

  afterEach(() => {
    cleanup()
    images.restore()
  })

  const imageAvatar = {
    type: AvatarType.IMAGE,
    imageAvatar: { url: 'https://cdn.example.com/bot.png' },
    iconAvatar: null,
  }

  it.each([
    { size: '1', width: 48 },
    { size: '2', width: 64 },
    { size: '3', width: 96 },
    { size: '4', width: 96 },
    { size: '5', width: 128 },
    { size: '6', width: 256 },
    { size: '7', width: 256 },
    { size: '8', width: 256 },
    { size: '9', width: 384 },
    { size: '10', width: 384 },
  ] as const)(
    'requests a $width px wide image for size $size',
    async ({ size, width }) => {
      const { container } = render(
        <Theme>
          <SuperinterfaceProvider baseUrl="https://app.example.com/api">
            <Avatar
              avatar={imageAvatar}
              // @ts-expect-error sizes above 9 fall back to the largest image
              size={size}
              className="bot-avatar"
              style={{ margin: 2 }}
            />
          </SuperinterfaceProvider>
        </Theme>,
      )

      await waitFor(() =>
        expect(container.querySelector('img')?.getAttribute('src')).toBe(
          `https://app.example.com/_next/image?url=${encodeURIComponent('https://cdn.example.com/bot.png')}&w=${width}&q=95`,
        ),
      )
      const root = container.querySelector('.rt-AvatarRoot') as HTMLElement
      expect(root.className).toContain('bot-avatar')
      expect(root.style.margin).toBe('2px')
    },
  )

  it('requests the image from the page origin with a relative base url', async () => {
    const { container } = render(
      <Theme>
        <SuperinterfaceProvider baseUrl="/api">
          <Avatar avatar={imageAvatar} />
        </SuperinterfaceProvider>
      </Theme>,
    )

    await waitFor(() =>
      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        `/_next/image?url=${encodeURIComponent('https://cdn.example.com/bot.png')}&w=48&q=95`,
      ),
    )
  })

  it('shows nothing for an icon this version does not know', () => {
    const { container } = render(
      <Theme>
        <Avatar
          avatar={{
            type: AvatarType.ICON,
            imageAvatar: null,
            iconAvatar: { name: 'UNICORN' as IconAvatarName },
          }}
        />
      </Theme>,
    )

    expect(container.querySelector('.rt-AvatarRoot')!.textContent).toBe('')
    expect(container.querySelector('svg')).toBeNull()
  })
})
