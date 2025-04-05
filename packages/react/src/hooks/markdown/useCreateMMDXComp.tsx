import React, { useEffect, useMemo, useState } from 'react'
import { MDXProvider, useMDXComponents } from '@mdx-js/react'
import * as runtime from 'react/jsx-runtime'
import { compile } from '@mdx-js/mdx'
import { escapeInvalidTagNames } from '@/lib/markdown/escapeInvalidTagNames'
import { recmaFallbackComponentPlugin } from '@/lib/recma/recmaFallbackComponentPlugin'
import OpenAI from 'openai'
import { ErrorBoundary } from 'react-error-boundary'
import { Badge } from '@radix-ui/themes'
import { useMarkdownContext } from './useMarkdownContext'
import { useSuperinterfaceContext } from '../core/useSuperinterfaceContext'

const evaluate = async ({ code }: { code: string }) => {
  const fn = new Function('runtime', 'useMDXComponents', code)
  return fn({ ...runtime, useMDXComponents })
}

type Props = {
  content:
    | OpenAI.Beta.Threads.Messages.Message['content'][number]
    | OpenAI.Beta.Threads.Messages.TextContentBlock
}

export const useCreateMMDXComp = ({ content }: Props) => {
  const { getRemarkPlugins, components } = useMarkdownContext()
  const superinterfaceContext = useSuperinterfaceContext()
  const nextSearchParams = new URLSearchParams(superinterfaceContext.variables)

  const remarkPlugins = useMemo(
    () => getRemarkPlugins({ content }),
    [content, getRemarkPlugins]
  )

  const [MDXComponent, setMDXComponent] = useState<React.ComponentType | null>(
    null
  )

  useEffect(() => {
    const compileMDX = async () => {
      try {
        const contentValue = (() => {
          if (content.type === 'text') {
            return content.text.value
          }
          if (content.type === 'image_file') {
            return `<MarkdownImg src="${superinterfaceContext.baseUrl}/files/${content.image_file.file_id}/contents?${nextSearchParams}" alt="output image"></MarkdownImg>`
          }
          return ''
        })()

        const compiled = await compile(escapeInvalidTagNames(contentValue), {
          outputFormat: 'function-body',
          remarkPlugins,
          recmaPlugins: [recmaFallbackComponentPlugin],
          providerImportSource: '@mdx-js/react',
        })

        const code = String(compiled)

        const module = await evaluate({ code })

        const { default: MDXContent } = module

        setMDXComponent(() => MDXContent)
      } catch (error) {}
    }

    compileMDX()
  }, [content, remarkPlugins])

  if (!MDXComponent) return null

  return (
    <ErrorBoundary
      fallback={
        <Badge color="red" mb="2">
          Could not render message.
        </Badge>
      }
    >
      <MDXProvider components={components}>
        <MDXComponent />
      </MDXProvider>
    </ErrorBoundary>
  )
}
