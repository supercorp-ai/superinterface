import { afterEach, describe, expect, inject, it } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { Thread } from '@/components/threads/Thread'
import { MarkdownProvider } from '@/components/markdown/MarkdownProvider'
import { SourceAnnotation } from '@/components/annotations/SourceAnnotation'
import { useMarkdownContext } from '@/hooks/markdown/useMarkdownContext'
import type { Plugin } from 'unified'
import { createOpenaiAssistantsTestAssistant } from '../lib/createOpenaiAssistantsTestAssistant'
import { renderWithSuperinterface } from '../lib/renderWithSuperinterface'
import { startFakeAssistantsApi } from '../lib/startFakeAssistantsApi'
import { submitThreadMessage } from '../lib/submitThreadMessage'

// An annotation over the first occurrence of `text` in `value`.
const annotationOver = ({
  value,
  text,
  ...rest
}: {
  value: string
  text: string
  [key: string]: unknown
}) => {
  const start = value.indexOf(text)

  return { text, start_index: start, end_index: start + text.length, ...rest }
}

const citedReply = [
  'Remote work is allowed【4:0†policy.pdf】.',
  '',
  '[Download the report](sandbox:/mnt/data/report.csv)',
  '',
  '[Download the log](sandbox:/mnt/data/run.log)',
  '',
  '![Sales chart](sandbox:/mnt/data/chart.png)',
].join('\n')

const citedAnnotations = [
  annotationOver({
    value: citedReply,
    text: '【4:0†policy.pdf】',
    type: 'file_citation',
    file_citation: { file_id: 'file-policy', quote: '' },
  }),
  annotationOver({
    value: citedReply,
    text: 'sandbox:/mnt/data/report.csv',
    type: 'file_path',
    file_path: { file_id: 'file-report' },
  }),
  annotationOver({
    value: citedReply,
    text: 'sandbox:/mnt/data/run.log',
    type: 'file_path',
    file_path: { file_id: 'cfile-log', container_id: 'cntr_1' },
  }),
  annotationOver({
    value: citedReply,
    text: 'sandbox:/mnt/data/chart.png',
    type: 'file_path',
    file_path: { file_id: 'cfile-chart', container_id: 'cntr_1' },
  }),
]

describe('annotated replies', () => {
  let fakeApi: Awaited<ReturnType<typeof startFakeAssistantsApi>>

  afterEach(async () => {
    cleanup()
    await fakeApi.close()
  })

  const renderReply = async ({
    replies,
    wrap = (children) => children,
    waitForText,
  }: {
    replies: Parameters<typeof startFakeAssistantsApi>[0]['replies']
    wrap?: (children: React.ReactNode) => React.ReactNode
    waitForText: string | RegExp
  }) => {
    fakeApi = await startFakeAssistantsApi({ replies })
    const { assistant, publicKey } = await createOpenaiAssistantsTestAssistant({
      openaiBaseUrl: fakeApi.baseURL,
    })

    renderWithSuperinterface({
      variables: { publicApiKey: publicKey, assistantId: assistant.id },
      children: wrap(<Thread />),
    })

    await submitThreadMessage({ content: 'What is the policy?' })
    await screen.findByText(waitForText, {}, { timeout: 15_000 })

    return { assistant, publicKey }
  }

  const fileContentsUrl = ({
    fileId,
    assistantId,
    publicApiKey,
    containerId,
  }: {
    fileId: string
    assistantId: string
    publicApiKey: string
    containerId?: string
  }) => {
    const { apiBaseUrl } = inject('testServer')
    const searchParams = new URLSearchParams({ publicApiKey, assistantId })
    if (containerId) searchParams.set('containerId', containerId)

    return `${apiBaseUrl}/files/${fileId}/contents?${searchParams}`
  }

  it('renders citations, file download links and file images', async () => {
    const { assistant, publicKey } = await renderReply({
      replies: [{ text: citedReply, annotations: citedAnnotations }],
      waitForText: 'Download the report',
    })

    // The citation marker is replaced by a button that explains the source.
    expect(screen.getByText(/Remote work is allowed/).textContent).toBe(
      'Remote work is allowed.',
    )
    const [citation] = screen.getAllByRole('button', { name: '' })
    fireEvent.click(citation)
    expect(await screen.findByText('File cited.')).toBeTruthy()

    const report = screen.getByRole('link', { name: 'Download the report' })
    expect(report.getAttribute('href')).toBe(
      fileContentsUrl({
        fileId: 'file-report',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )
    expect(report.getAttribute('target')).toBe('_self')
    expect(report.hasAttribute('download')).toBe(true)

    expect(
      screen
        .getByRole('link', { name: 'Download the log' })
        .getAttribute('href'),
    ).toBe(
      fileContentsUrl({
        fileId: 'cfile-log',
        assistantId: assistant.id,
        publicApiKey: publicKey,
        containerId: 'cntr_1',
      }),
    )

    // The chart's file_path annotation lies within the image's offsets in
    // the reply, so the image shows the file's contents.
    const chart = screen.getByRole('img', { name: 'Sales chart' })
    expect(chart.getAttribute('src')).toBe(
      fileContentsUrl({
        fileId: 'cfile-chart',
        assistantId: assistant.id,
        publicApiKey: publicKey,
        containerId: 'cntr_1',
      }),
    )
    expect(chart.hasAttribute('data-file-annotation')).toBe(false)
  }, 30_000)

  it('opens the cited file with SourceAnnotation', async () => {
    const { assistant, publicKey } = await renderReply({
      replies: [{ text: citedReply, annotations: citedAnnotations }],
      wrap: (children) => (
        <MarkdownProvider components={{ annotation: SourceAnnotation }}>
          {children}
        </MarkdownProvider>
      ),
      waitForText: 'Download the report',
    })

    expect(
      screen
        .getByRole('link', { name: 'Download the report' })
        .getAttribute('href'),
    ).toBe(
      fileContentsUrl({
        fileId: 'file-report',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )

    const [citation] = screen.getAllByRole('button', { name: '' })
    fireEvent.click(citation)

    // FileCitation lays its dialog out as a column for the source to fill.
    const dialog = await screen.findByRole('dialog', { name: 'Source' })
    expect(dialog.style.display).toBe('flex')
    expect(dialog.style.flexDirection).toBe('column')
    expect(dialog.querySelector('embed')?.getAttribute('src')).toBe(
      fileContentsUrl({
        fileId: 'file-policy',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )

    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  }, 30_000)

  it('lists citations without a marker after the reply', async () => {
    const text = 'Remote work is allowed【7:1†source】 on Fridays.'

    await renderReply({
      replies: [
        {
          text,
          annotations: [
            {
              type: 'file_citation',
              text: 'policy.pdf',
              start_index: 0,
              end_index: 0,
              file_citation: { file_id: 'file-policy' },
            },
          ],
        },
      ],
      waitForText: /on Fridays/,
    })

    // The unmatched marker is dropped, and the citation follows the text.
    expect(screen.getByText(/on Fridays/).textContent).toBe(
      'Remote work is allowed on Fridays.',
    )
    const [citation] = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-haspopup') === 'dialog')
    expect(citation.closest('p, .rt-Box')?.textContent).toBe('')
    fireEvent.click(citation)
    expect(await screen.findByText('File cited.')).toBeTruthy()
  }, 30_000)

  it('only rewrites links whose url is annotated', async () => {
    const text =
      'See the [**bold** report](sandbox:/mnt/data/report.csv) and [our site](https://example.com/about).[](https://example.com/empty)'
    const { assistant, publicKey } = await renderReply({
      replies: [
        {
          text,
          annotations: [
            annotationOver({
              value: text,
              text: 'sandbox:/mnt/data/report.csv',
              type: 'file_path',
              file_path: { file_id: 'file-report' },
            }),
          ],
        },
      ],
      waitForText: 'our site',
    })

    expect(
      screen.getByRole('link', { name: 'bold report' }).getAttribute('href'),
    ).toBe(
      fileContentsUrl({
        fileId: 'file-report',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )
    const site = screen.getByRole('link', { name: 'our site' })
    expect(site.getAttribute('href')).toBe('https://example.com/about')
    expect(site.getAttribute('target')).toBe('_blank')
    expect(
      document.querySelector('a[href="https://example.com/empty"]')!
        .textContent,
    ).toBe('')
  }, 30_000)

  it('drops markers without a citation when some citations are broken', async () => {
    const text = [
      '**Policy**【7:1†source】**Rules**',
      '',
      'Use 【brackets carefully.',
      '',
      '【1:0†a】Remote work【2:0†b】 is fine【3:0†c】.',
      '',
      '[Report](sandbox:/mnt/data/r.csv)',
    ].join('\n')

    await renderReply({
      replies: [
        {
          text,
          annotations: [
            annotationOver({
              value: text,
              text: 'sandbox:/mnt/data/r.csv',
              type: 'file_path',
              file_path: { file_id: 'file-r' },
            }),
            annotationOver({
              value: text,
              text: '【2:0†b】',
              type: 'file_citation',
              file_citation: { file_id: 'file-b' },
            }),
            {
              type: 'file_citation',
              text: 'policy.pdf',
              start_index: 0,
              end_index: 0,
              file_citation: { file_id: 'file-policy' },
            },
          ],
        },
      ],
      waitForText: 'Use 【brackets carefully.',
    })

    expect(screen.getByText('Policy').parentElement!.textContent).toBe(
      'PolicyRules',
    )
    const remoteWork = screen.getByText(/Remote work/).closest('span')!
    expect(remoteWork.textContent).toBe('Remote work is fine.')
    expect(remoteWork.querySelectorAll('button')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Report' })).toBeTruthy()
    // The citation without a marker is listed after the reply.
    const citations = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-haspopup') === 'dialog')
    expect(citations).toHaveLength(2)
  }, 30_000)

  it.each([
    { name: 'the default annotation', wrap: undefined },
    {
      name: 'SourceAnnotation',
      wrap: (children: React.ReactNode) => (
        <MarkdownProvider components={{ annotation: SourceAnnotation }}>
          {children}
        </MarkdownProvider>
      ),
    },
  ])(
    'shows nothing for unknown annotation types with $name',
    async ({ wrap }) => {
      const text = 'Vilnius is the capital【3:0†source】.'

      await renderReply({
        replies: [
          {
            text,
            annotations: [
              annotationOver({
                value: text,
                text: '【3:0†source】',
                type: 'url_citation',
                url_citation: {
                  url: 'https://en.wikipedia.org/wiki/Vilnius',
                  title: 'Vilnius',
                },
              }),
            ],
          },
        ],
        wrap,
        waitForText: /Vilnius is the capital/,
      })

      const reply = screen.getByText(/Vilnius is the capital/)
      expect(reply.textContent).toBe('Vilnius is the capital.')
      expect(reply.querySelector('button, a')).toBeNull()
    },
    30_000,
  )

  it('renders replies whose text has no annotations list', async () => {
    await renderReply({
      replies: [{ text: 'Plain **answer**.', annotations: null }],
      waitForText: 'answer',
    })

    expect(screen.getByText('answer').tagName).toBe('STRONG')
  }, 30_000)

  it.each([
    { name: 'the default annotation', wrap: undefined },
    {
      name: 'SourceAnnotation',
      wrap: (children: React.ReactNode) => (
        <MarkdownProvider components={{ annotation: SourceAnnotation }}>
          {children}
        </MarkdownProvider>
      ),
    },
  ])(
    'renders file images and annotations that remark plugins add with $name',
    async ({ wrap = (children: React.ReactNode) => children }) => {
      // Adds a file image by its annotation alone, with no url to show, and
      // an annotation element that carries no annotation, through `hName`.
      const addFileElements: Plugin = () => (root) => {
        const tree = root as unknown as { children: unknown[] }
        tree.children.push({
          type: 'paragraph',
          children: [
            {
              type: 'fileImage',
              data: {
                hName: 'img',
                hProperties: {
                  alt: 'Chart',
                  'data-file-annotation': JSON.stringify({
                    type: 'file_path',
                    file_path: { file_id: 'file-chart' },
                  }),
                },
              },
            },
            {
              type: 'note',
              data: { hName: 'annotation' },
              children: [{ type: 'text', value: 'Unsourced' }],
            },
          ],
        })
      }

      const WithFileElements = ({
        children,
      }: {
        children: React.ReactNode
      }) => {
        const { getRemarkPlugins } = useMarkdownContext()

        return (
          <MarkdownProvider
            getRemarkPlugins={(args) => [
              ...getRemarkPlugins(args),
              addFileElements,
            ]}
          >
            {children}
          </MarkdownProvider>
        )
      }

      const { assistant, publicKey } = await renderReply({
        replies: [{ text: 'Here is the chart.', annotations: [] }],
        wrap: (children) =>
          wrap(<WithFileElements>{children}</WithFileElements>),
        waitForText: 'Here is the chart.',
      })

      // Remark plugins run for every message: the question and the reply.
      const charts = await screen.findAllByRole('img', { name: 'Chart' })
      const chartUrl = fileContentsUrl({
        fileId: 'file-chart',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      })
      expect(charts.map((chart) => chart.getAttribute('src'))).toEqual([
        chartUrl,
        chartUrl,
      ])
      charts.forEach((chart) => {
        expect(chart.hasAttribute('data-file-annotation')).toBe(false)
        expect(chart.parentElement!.querySelector('button, a')).toBeNull()
      })
      // An annotation element without an annotation renders nothing.
      expect(screen.queryByText('Unsourced')).toBeNull()
    },
    30_000,
  )

  it('rewrites an annotated link whose label a remark plugin builds from a number', async () => {
    const text = 'Get [Q](sandbox:/mnt/data/q4.csv) now.'

    // Spells out the quarter with a numeric text value, which only text
    // nodes holding strings count towards the label length.
    const spellQuarter: Plugin = () => (root) => {
      const tree = root as unknown as {
        children: { children: { type: string; children?: unknown[] }[] }[]
      }
      const link = tree.children[0].children.find(
        ({ type }) => type === 'link',
      )!
      link.children = [...link.children!, { type: 'text', value: 4 }]
    }

    const WithQuarter = ({ children }: { children: React.ReactNode }) => {
      const { getRemarkPlugins } = useMarkdownContext()

      return (
        <MarkdownProvider
          getRemarkPlugins={(args) => [spellQuarter, ...getRemarkPlugins(args)]}
        >
          {children}
        </MarkdownProvider>
      )
    }

    const { assistant, publicKey } = await renderReply({
      replies: [
        {
          text,
          annotations: [
            annotationOver({
              value: text,
              text: 'sandbox:/mnt/data/q4.csv',
              type: 'file_path',
              file_path: { file_id: 'file-q4' },
            }),
          ],
        },
      ],
      wrap: (children) => <WithQuarter>{children}</WithQuarter>,
      waitForText: 'Q4',
    })

    expect(screen.getByRole('link', { name: 'Q4' }).getAttribute('href')).toBe(
      fileContentsUrl({
        fileId: 'file-q4',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )
  }, 30_000)

  it('keeps what remark plugins added before the annotations', async () => {
    const text = [
      '![Chart](sandbox:/mnt/data/chart.png)',
      '',
      '![Logo](sandbox:/mnt/data/logo.png)',
      '',
      'Body【1:0†a】.',
    ].join('\n')

    // Frames images, and appends a footer the way remark plugins build
    // nodes: without (or with partial) source positions.
    const decorate: Plugin = () => (root) => {
      const tree = root as unknown as {
        children: { type: string; data?: unknown; children?: unknown[] }[]
      }
      const [chart, logo] = tree.children.flatMap(
        (node) => (node.children ?? []) as { type: string; data?: unknown }[],
      )
      chart.data = { hProperties: { className: 'framed' } }
      logo.data = { kind: 'logo' }
      const at = (offset?: number) => ({ line: 1, column: 1, offset })
      tree.children.push({
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Footer' },
          {
            type: 'text',
            value: '',
            position: { start: at(0), end: at(0) },
          },
          {
            type: 'text',
            value: ' note',
            position: { start: at(), end: at() },
          },
          {
            type: 'text',
            value: ' end',
            position: { start: at(0), end: at() },
          },
          {
            type: 'image',
            url: 'https://example.com/badge.png',
            alt: 'Badge',
            position: { start: at(), end: at() },
          },
          {
            type: 'image',
            url: 'https://example.com/seal.png',
            alt: 'Seal',
            position: { start: at(0), end: at() },
          },
        ],
      })
    }

    const WithDecorations = ({ children }: { children: React.ReactNode }) => {
      const { getRemarkPlugins } = useMarkdownContext()

      return (
        <MarkdownProvider
          getRemarkPlugins={(args) => [decorate, ...getRemarkPlugins(args)]}
        >
          {children}
        </MarkdownProvider>
      )
    }

    const { assistant, publicKey } = await renderReply({
      replies: [
        {
          text,
          annotations: [
            annotationOver({
              value: text,
              text: 'sandbox:/mnt/data/chart.png',
              type: 'file_path',
              file_path: { file_id: 'file-chart' },
            }),
            annotationOver({
              value: text,
              text: 'sandbox:/mnt/data/logo.png',
              type: 'file_path',
              file_path: { file_id: 'file-logo' },
            }),
            annotationOver({
              value: text,
              text: '【1:0†a】',
              type: 'file_citation',
              file_citation: { file_id: 'file-a' },
            }),
          ],
        },
      ],
      wrap: (children) => <WithDecorations>{children}</WithDecorations>,
      waitForText: 'Footer note end',
    })

    const chart = screen.getByRole('img', { name: 'Chart' })
    expect(chart.className).toBe('framed')
    expect(chart.getAttribute('src')).toBe(
      fileContentsUrl({
        fileId: 'file-chart',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )
    expect(screen.getByRole('img', { name: 'Logo' }).getAttribute('src')).toBe(
      fileContentsUrl({
        fileId: 'file-logo',
        assistantId: assistant.id,
        publicApiKey: publicKey,
      }),
    )
    expect(screen.getByRole('img', { name: 'Badge' }).getAttribute('src')).toBe(
      'https://example.com/badge.png',
    )
    expect(screen.getByRole('img', { name: 'Seal' }).getAttribute('src')).toBe(
      'https://example.com/seal.png',
    )
  }, 30_000)
})

describe('SourceAnnotation', () => {
  afterEach(() => {
    cleanup()
  })

  it('lays out the dialog of a cited file as a column the source fills', async () => {
    renderWithSuperinterface({
      variables: { publicApiKey: 'public-key', assistantId: 'asst_source' },
      children: (
        <SourceAnnotation
          data-annotation={JSON.stringify({
            type: 'file_citation',
            text: '【1:0†source】',
            start_index: 0,
            end_index: 0,
            file_citation: { file_id: 'file-policy' },
          })}
        >
          cited
        </SourceAnnotation>
      ),
    })

    fireEvent.click(screen.getByRole('button'))

    const dialog = await screen.findByRole('dialog', { name: 'Source' })
    expect(dialog.style.display).toBe('flex')
    expect(dialog.style.flexDirection).toBe('column')
    const { apiBaseUrl } = inject('testServer')
    expect(dialog.querySelector('embed')!.getAttribute('src')).toBe(
      `${apiBaseUrl}/files/file-policy/contents?publicApiKey=public-key&assistantId=asst_source`,
    )
  }, 30_000)
})
