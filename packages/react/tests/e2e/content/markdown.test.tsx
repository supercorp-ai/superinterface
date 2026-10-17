import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { renderAssistantReply } from '../lib/renderAssistantReply'
import { WithRemarkPlugin } from '../lib/WithRemarkPlugin'

const richReply = [
  '# Heading one',
  '## Heading two',
  '### Heading three',
  '#### Heading four',
  '##### Heading five',
  '###### Heading six',
  '',
  'Some **bold words** with `inline code` and a [docs link](https://example.com/docs).',
  '',
  '- first bullet',
  '- second bullet',
  '',
  '1. first step',
  '2. second step',
  '',
  '| Name | Value |',
  '| --- | --- |',
  '| alpha | 1 |',
  '',
  '```js',
  'const answer = 42',
  '```',
  '',
  '![Cat photo](https://example.com/cat.png)',
].join('\n')

describe('markdown replies', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('renders headings, emphasis, links, lists, tables, code and images', async () => {
    fakeLlm = await startFakeLlm({ replies: [{ content: richReply }] })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Heading one',
    })

    const headings = [1, 2, 3, 4, 5, 6].map(
      (level) => screen.getByRole('heading', { level }).textContent,
    )
    expect(headings).toEqual([
      'Heading one',
      'Heading two',
      'Heading three',
      'Heading four',
      'Heading five',
      'Heading six',
    ])

    expect(screen.getByText('bold words').tagName).toBe('STRONG')
    expect(screen.getByText('inline code').tagName).toBe('CODE')

    const link = screen.getByRole('link', { name: 'docs link' })
    expect(link.getAttribute('href')).toBe('https://example.com/docs')
    expect(link.getAttribute('target')).toBe('_blank')

    const paragraph = screen.getByText('bold words').parentElement!
    expect(paragraph.style.whiteSpace).toBe('pre-line')
    expect(paragraph.style.wordBreak).toBe('break-word')

    const [unordered, ordered] = screen.getAllByRole('list')
    expect(unordered.tagName).toBe('UL')
    expect(unordered.style.listStyleType).toBe('disc')
    expect(unordered.style.listStylePosition).toBe('outside')
    expect(
      within(unordered)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['first bullet', 'second bullet'])
    expect(ordered.tagName).toBe('OL')
    expect(ordered.style.listStyleType).toBe('decimal')
    expect(ordered.style.listStylePosition).toBe('outside')
    expect(
      within(ordered)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['first step', 'second step'])
    const [firstStep] = within(ordered).getAllByRole('listitem')
    expect(firstStep.style.display).toBe('list-item')
    expect(firstStep.style.wordBreak).toBe('break-word')

    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Name', 'Value'])
    expect(
      within(table)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['alpha', '1'])

    const codeBlock = screen.getByText('const answer = 42')
    expect(codeBlock.tagName).toBe('CODE')
    expect(codeBlock.closest('div')?.style.whiteSpace).toBe('pre-wrap')

    const image = screen.getByRole('img', { name: 'Cat photo' })
    expect(image.getAttribute('src')).toBe('https://example.com/cat.png')
  }, 30_000)

  it('passes a cell width that a remark plugin sets to the table cell', async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: '| Name |\n| --- |\n| alpha |' }],
    })

    const cellWidths: Plugin = () => (root) => {
      visit(root, 'tableCell', (node) => {
        node.data = { hProperties: { width: '120px' } }
      })
    }

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'alpha',
      wrap: (children) => (
        <WithRemarkPlugin plugin={cellWidths}>{children}</WithRemarkPlugin>
      ),
    })

    // Radix's Table.Cell takes the width as a prop, not as an attribute.
    const cell = screen.getByRole('cell', { name: 'alpha' })
    expect(cell.style.getPropertyValue('--width')).toBe('120px')
    expect(cell.className).toBe('rt-TableCell rt-r-w')
    expect(cell.hasAttribute('width')).toBe(false)
  }, 30_000)
})
