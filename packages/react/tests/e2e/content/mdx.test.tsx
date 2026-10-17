import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { MarkdownProvider } from '@/components/markdown/MarkdownProvider'
import { startFakeLlm } from '../../../../server/tests/lib/llm/startFakeLlm'
import { renderAssistantReply } from '../lib/renderAssistantReply'
import { WithRemarkPlugin } from '../lib/WithRemarkPlugin'

const Weather = ({
  city,
  temperature,
  note,
  units,
  tags,
  children,
}: {
  city: string
  temperature: number
  note: string
  units: { scale: string }
  tags: string[]
  children?: React.ReactNode
}) => (
  <section aria-label="weather">
    <span data-testid="city">{city}</span>
    <span data-testid="temperature">
      {typeof temperature}:{temperature}
    </span>
    <span data-testid="note">{note}</span>
    <span data-testid="units">{units?.scale}</span>
    <span data-testid="tags">{tags?.join(',')}</span>
    {children}
  </section>
)

describe('MDX in replies', () => {
  let fakeLlm: Awaited<ReturnType<typeof startFakeLlm>>

  afterEach(async () => {
    cleanup()
    await fakeLlm.close()
  })

  it('renders custom components given to MarkdownProvider with literal props', async () => {
    fakeLlm = await startFakeLlm({
      replies: [
        {
          content: [
            'Here is the forecast:',
            '',
            '<Weather city="Vilnius" temperature={21} note={forecast.today} units={{ scale: "celsius" }} tags={["sunny", `warm`]}>',
            '  Have a nice day.',
            '</Weather>',
          ].join('\n'),
        },
      ],
    })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Vilnius',
      wrap: (children) => (
        <MarkdownProvider components={{ Weather }}>{children}</MarkdownProvider>
      ),
    })

    expect(screen.getByTestId('temperature').textContent).toBe('number:21')
    // Expressions that are not plain literals are never evaluated.
    expect(screen.getByTestId('note').textContent).toBe('{forecast.today}')
    expect(screen.getByTestId('units').textContent).toBe('celsius')
    expect(screen.getByTestId('tags').textContent).toBe('sunny,warm')
    expect(screen.getByText('Have a nice day.')).toBeTruthy()
    expect(screen.getByText('Here is the forecast:')).toBeTruthy()
  }, 30_000)

  it('passes literal props as values and other expressions as text', async () => {
    const Props = (props: Record<string, unknown>) => (
      <pre data-testid="props">{JSON.stringify(props)}</pre>
    )
    fakeLlm = await startFakeLlm({
      replies: [
        {
          content: [
            'Props:',
            '',
            '<Props',
            '  sunny',
            '  none={null}',
            '  on={true}',
            '  keys={{ "label": "x", 2: "two", id: 1 }}',
            '  greeting={`hi ${name}`}',
            '  computed={{ [key]: 1 }}',
            '  spread={{ ...base }}',
            '  method={{ go() {} }}',
            '  holes={[1, , 2]}',
            '  big={{ 1n: 2 }}',
            '/>',
          ].join('\n'),
        },
      ],
    })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Props:',
      wrap: (children) => (
        <MarkdownProvider components={{ Props }}>{children}</MarkdownProvider>
      ),
    })

    expect(
      JSON.parse((await screen.findByTestId('props')).textContent!),
    ).toEqual({
      sunny: true,
      none: null,
      on: true,
      keys: { label: 'x', 2: 'two', id: 1 },
      greeting: '{`hi ${name}`}',
      computed: '{{ [key]: 1 }}',
      spread: '{{ ...base }}',
      method: '{{ go() {} }}',
      holes: '{[1, , 2]}',
      big: '{{ 1n: 2 }}',
    })
  }, 30_000)

  // BUG: `export` statements in a reply are compiled and run as JavaScript
  // in the page, so a reply (e.g. one steered by a prompt injection) can run
  // any code with the user's session.
  it('BUG: runs JavaScript from export statements in replies', async () => {
    const globals = globalThis as {
      superinterfaceReplyRan?: string
      superinterfaceNestedConst?: string
      superinterfaceNestedCheck?: string
    }
    delete globals.superinterfaceReplyRan
    delete globals.superinterfaceNestedConst
    delete globals.superinterfaceNestedCheck
    fakeLlm = await startFakeLlm({
      replies: [
        {
          content: [
            "export const ran = (globalThis.superinterfaceReplyRan = 'yes')",
            '',
            'export function pick(items, key) {',
            '  for (const { name } of items) {',
            '    if (!name) continue',
            '    if (-name) items.length = 0',
            '    if (!key) { return name }',
            '    if (!items) key = name',
            '    if (!items) items.pop()',
            '    if (!items) String(items)',
            '  }',
            '  let missing',
            '  const { length } = items',
            '  return length',
            '}',
            '',
            // The fallback rewrite turns a top-level destructuring into a
            // `let` and then stops, so a nested one stays a `const` that its
            // own missing check cannot assign to.
            "export const { nested } = { nested: () => { const { inner } = {}; if (!inner) _missingMdxReference('inner', true); return typeof inner } }",
            'export const nestedConst = (globalThis.superinterfaceNestedConst = (() => { try { return nested() } catch (error) { return error.name } })())',
            '',
            // Once it rewrote a missing check, the rewrite does not look
            // inside it, so a check nested in its arguments stays as written.
            "export const nestedCheck = (() => { let outer; if (!outer) _missingMdxReference((() => { let inner; if (!inner) _missingMdxReference('inner', true); return (globalThis.superinterfaceNestedCheck = typeof inner) })()) })()",
            '',
            '<Absent />',
            '',
            'The reply ran code.',
          ].join('\n'),
        },
      ],
    })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'The reply ran code.',
    })

    expect(globals.superinterfaceReplyRan).toBe('yes')
    expect(globals.superinterfaceNestedConst).toBe('TypeError')
    expect(globals.superinterfaceNestedCheck).toBe('undefined')
    expect(screen.getByText('<Absent></Absent>')).toBeTruthy()
    delete globals.superinterfaceReplyRan
    delete globals.superinterfaceNestedConst
    delete globals.superinterfaceNestedCheck
  }, 30_000)

  it('shows unknown components, expressions and invalid tags as text', async () => {
    fakeLlm = await startFakeLlm({
      replies: [
        {
          content: [
            'Total: {price * 2} today.',
            '',
            '{user.name}',
            '',
            'Some <Unknown>ignored</Unknown> things.',
            '',
            '<Missing />',
            '',
            'Write to <hello@example.com> today.',
          ].join('\n'),
        },
      ],
    })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Total: {price * 2} today.',
    })

    // Missing components render as their tag instead of failing the reply.
    expect(screen.queryByText('Could not render message.')).toBeNull()
    // A block expression becomes a bare text node next to the paragraphs.
    const reply = screen.getByText('Total: {price * 2} today.').parentElement!
      .parentElement!
    expect(reply.textContent).toContain('{user.name}')
    expect(screen.getByText('Some <Unknown></Unknown> things.')).toBeTruthy()
    expect(reply.textContent).toContain('<Missing></Missing>')
    const email = screen.getByRole('link', { name: 'hello@example.com' })
    expect(email.getAttribute('href')).toBe('mailto:hello@example.com')
    expect(email.parentElement!.textContent).toBe(
      'Write to <hello@example.com> today.',
    )
  }, 30_000)

  it('hands expressions to later remark plugins as plain text nodes', async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Total: {price * 2} today.\n\n{user.name}' }],
    })

    // Appends the fields of each text node that holds an expression.
    const listFields: Plugin = () => (root) => {
      visit(root, 'text', (node: { value: string }) => {
        if (!node.value.startsWith('{')) return
        node.value += ` [${Object.keys(node).sort().join(' ')}]`
      })
    }

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: /today\./,
      wrap: (children) => (
        <WithRemarkPlugin plugin={listFields}>{children}</WithRemarkPlugin>
      ),
    })

    const paragraph = screen.getByText(/today\./)
    expect(paragraph.textContent).toBe(
      'Total: {price * 2} [position type value] today.',
    )
    expect(paragraph.parentElement!.parentElement!.textContent).toContain(
      '{user.name} [position type value]',
    )
  }, 30_000)

  // BUG: escapeInvalidTagNames matches from an invalid tag like `<3` up to
  // the next `>`, so it also escapes the opening tag that follows. The
  // closing tag is left unmatched, MDX fails to compile and the whole reply
  // shows as raw source.
  it('BUG: shows the raw reply when an invalid tag precedes a component', async () => {
    const content = 'I <3 tea and <Unknown>this</Unknown> component.'
    fakeLlm = await startFakeLlm({ replies: [{ content }] })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: content,
    })
  }, 30_000)

  // BUG: remarkPureLiteralPlugin turns a spread attribute that is not a pure
  // literal into a nameless attribute, which MDX cannot compile, so the whole
  // reply shows as raw source instead of rendering the component.
  it('BUG: shows the raw reply when a component has a spread attribute', async () => {
    const content = 'Forecast <Weather {...{ city: "Vilnius" }} /> today.'
    fakeLlm = await startFakeLlm({ replies: [{ content }] })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: content,
      wrap: (children) => (
        <MarkdownProvider components={{ Weather }}>{children}</MarkdownProvider>
      ),
    })
    // Left as a spread, the attribute would render Weather for Vilnius.
    expect(screen.queryByRole('region', { name: 'weather' })).toBeNull()
    expect(screen.queryByTestId('city')).toBeNull()
  }, 30_000)

  it('shows an error badge when a reply references a missing component member', async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Chart:\n\n<Charts.Bar values={[1, 2]} />' }],
    })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: 'Could not render message.',
    })
  }, 30_000)

  it('keeps the raw text when a reply is not valid MDX', async () => {
    const content = 'Broken <Weather city="Vilnius"> tag'
    fakeLlm = await startFakeLlm({ replies: [{ content }] })

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: content,
    })
  }, 30_000)

  it('uses remark plugins and components from nested MarkdownProviders', async () => {
    fakeLlm = await startFakeLlm({
      replies: [{ content: 'Plain **strong** words.' }],
    })

    const shout: Plugin = () => (root) => {
      const tree = root as unknown as {
        children: { children?: { value?: string }[] }[]
      }
      tree.children.forEach((node) =>
        node.children?.forEach((child) => {
          if (child.value) child.value = child.value.toUpperCase()
        }),
      )
    }

    await renderAssistantReply({
      llmBaseUrl: fakeLlm.baseURL,
      waitForText: /PLAIN/,
      wrap: (children) => (
        <MarkdownProvider getRemarkPlugins={() => [shout]}>
          <MarkdownProvider
            components={{
              strong: ({ children }: { children: React.ReactNode }) => (
                <mark>{children}</mark>
              ),
            }}
          >
            {children}
          </MarkdownProvider>
        </MarkdownProvider>
      ),
    })

    expect(screen.getByText('strong').tagName).toBe('MARK')
    expect(screen.getByText(/WORDS\./)).toBeTruthy()
  }, 30_000)
})
