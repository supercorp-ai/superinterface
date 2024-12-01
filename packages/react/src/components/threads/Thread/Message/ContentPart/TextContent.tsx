import OpenAI from 'openai'
import React, { useState, useEffect, useMemo } from 'react'
import { compile } from '@mdx-js/mdx'
import { MDXProvider, useMDXComponents } from '@mdx-js/react'
import * as runtime from 'react/jsx-runtime'
import recmaMdxEscapeMissingComponents from 'recma-mdx-escape-missing-components'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'

const evaluate = async ({
  code,
}: {
  code: string
}) => {
  const fn = new Function('runtime', 'useMDXComponents', code)
  return fn({ ...runtime, useMDXComponents })
}

export const TextContent = ({
  content
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock;
}) => {
  const { getRemarkPlugins, components } = useMarkdownContext()
  const remarkPlugins = useMemo(() => getRemarkPlugins({ content }), [content, getRemarkPlugins])

  const [MDXComponent, setMDXComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    const compileMDX = async () => {
      try {
        const compiled = await compile(content.text.value, {
          outputFormat: 'function-body',
          remarkPlugins,
          recmaPlugins: [recmaMdxEscapeMissingComponents],
          providerImportSource: '@mdx-js/react',
        })

        const code = String(compiled)

        const module = await evaluate({ code })

        const { default: MDXContent } = module

        setMDXComponent(() => MDXContent)
      } catch (error) {
      }
    }

    compileMDX()
  }, [content, remarkPlugins])

  if (!MDXComponent) return content.text.value

  return (
    <MDXProvider
      components={components}
    >
      <MDXComponent />
    </MDXProvider>
  )
}
