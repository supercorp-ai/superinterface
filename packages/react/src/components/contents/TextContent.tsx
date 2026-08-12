import type OpenAI from 'openai'
import React, { useState, useEffect, useMemo } from 'react'
import { Badge } from '@radix-ui/themes'
import { compile } from '@mdx-js/mdx'
import { MDXProvider, useMDXComponents } from '@mdx-js/react'
import * as runtime from 'react/jsx-runtime'
import { recmaFallbackComponentPlugin } from '@/lib/recma/recmaFallbackComponentPlugin'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'
import { escapeInvalidTagNames } from '@/lib/markdown/escapeInvalidTagNames'
import { ErrorBoundary } from 'react-error-boundary'

const evaluate = async ({ code }: { code: string }) => {
  const fn = new Function('runtime', 'useMDXComponents', code)
  return fn({ ...runtime, useMDXComponents })
}

export const TextContent = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  const { getRemarkPlugins, components } = useMarkdownContext()
  const remarkPlugins = useMemo(
    () => getRemarkPlugins({ content }),
    [content, getRemarkPlugins],
  )

  const [MDXComponent, setMDXComponent] = useState<React.ComponentType | null>(
    null,
  )

  useEffect(() => {
    const compileMDX = async () => {
      try {
        const compiled = await compile(
          escapeInvalidTagNames(content.text.value),
          {
            outputFormat: 'function-body',
            remarkPlugins,
            recmaPlugins: [recmaFallbackComponentPlugin],
            providerImportSource: '@mdx-js/react',
          },
        )

        const code = String(compiled)

        const module = await evaluate({ code })

        const { default: MDXContent } = module

        setMDXComponent(() => MDXContent)
      } catch (error) {}
    }

    compileMDX()
  }, [content, remarkPlugins])

  if (!MDXComponent) return content.text.value

  return (
    <ErrorBoundary
      fallback={
        <Badge
          color="red"
          mb="2"
        >
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
