import { describe, expect, test } from 'vitest'
import remarkGfm from 'remark-gfm'
import { compile } from '@mdx-js/mdx'
import { remarkPureLiteralPlugin } from './remarkPureLiteralPlugin'
import { remarkAnnotation } from './remarkAnnotation'
import { escapeInvalidTagNames } from '../markdown/escapeInvalidTagNames'

/**
 * Integration tests for the full markdown pipeline as used by TextContent.
 * Replicates the same plugin chain: remarkPureLiteralPlugin, remarkAnnotation,
 * remarkGfm — plus escapeInvalidTagNames preprocessing.
 */

const compileFullPipeline = async (text: string, annotations: any[] = []) => {
  const content = {
    type: 'text' as const,
    text: { value: text, annotations },
  }
  const preprocessed = escapeInvalidTagNames(text)
  const result = await compile(preprocessed, {
    outputFormat: 'function-body',
    remarkPlugins: [
      remarkPureLiteralPlugin,
      remarkAnnotation({ content }),
      remarkGfm,
    ],
  })
  return String(result)
}

// Matches _components.p but NOT _components.pre, _components.props, etc.
const componentsP = /_components\.p[,\s")}]/

describe('full markdown pipeline', () => {
  describe('basic elements', () => {
    test('renders plain text as paragraph', async () => {
      const result = await compileFullPipeline('Hello world!')
      expect(result).toMatch(componentsP)
      expect(result).toContain('Hello world!')
    })

    test('renders headings', async () => {
      const md = '# Title\n\n## Subtitle\n\n### Section'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.h1')
      expect(result).toContain('_components.h2')
      expect(result).toContain('_components.h3')
    })

    test('renders inline formatting', async () => {
      const md = '**bold** *italic* ~~struck~~ `code`'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.strong')
      expect(result).toContain('_components.em')
      expect(result).toContain('_components.del')
      expect(result).toContain('_components.code')
    })

    test('renders fenced code block', async () => {
      const md = '```javascript\nconst x = 1;\n```'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.pre')
      expect(result).toContain('_components.code')
      expect(result).toContain('language-javascript')
    })

    test('renders blockquote', async () => {
      const md = '> This is a quote\n> with two lines'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.blockquote')
    })

    test('renders link', async () => {
      const md = 'Visit [example](https://example.com) please.'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.a')
      expect(result).toContain('https://example.com')
    })

    test('renders horizontal rule', async () => {
      const md = 'Above\n\n---\n\nBelow'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.hr')
    })

    test('renders image', async () => {
      const md = '![alt text](https://example.com/img.png)'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.img')
      expect(result).toContain('https://example.com/img.png')
    })
  })

  describe('GFM features', () => {
    test('renders table', async () => {
      const md = [
        '| Name | Age |',
        '|------|-----|',
        '| Alice | 30 |',
        '| Bob | 25 |',
      ].join('\n')
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.table')
      expect(result).toContain('_components.thead')
      expect(result).toContain('_components.tbody')
      expect(result).toContain('_components.tr')
      expect(result).toContain('_components.th')
      expect(result).toContain('_components.td')
    })

    test('renders strikethrough', async () => {
      const md = 'This is ~~deleted~~ text.'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.del')
    })

    test('renders autolink', async () => {
      const md = 'Visit https://example.com for details.'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.a')
      expect(result).toContain('https://example.com')
    })

    test('renders task list', async () => {
      const md = '- [ ] Todo\n- [x] Done'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.input')
    })
  })

  describe('list rendering', () => {
    test('tight ordered list renders ol and li', async () => {
      const md = '1. First\n2. Second\n3. Third'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      // Tight lists do not wrap items in paragraphs
      expect(result).not.toMatch(componentsP)
    })

    test('tight unordered list renders ul and li', async () => {
      const md = '- First\n- Second\n- Third'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).not.toMatch(componentsP)
    })

    test('loose ordered list wraps items in paragraphs', async () => {
      const md = '1. First\n\n2. Second\n\n3. Third'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      // Loose lists produce paragraph elements inside list items — this is standard
      // markdown behavior and renders correctly with list-style-position: outside
      expect(result).toMatch(componentsP)
    })

    test('loose unordered list wraps items in paragraphs', async () => {
      const md = '- First\n\n- Second\n\n- Third'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).toMatch(componentsP)
    })

    test('list items with inline code', async () => {
      const md = '1. Use `npm install`\n2. Run `npm start`'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.code')
    })

    test('list items with links', async () => {
      const md =
        '- Visit [Google](https://google.com)\n- Check [GitHub](https://github.com)'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.a')
    })

    test('list items with mixed inline formatting', async () => {
      const md =
        '1. **Bold** and *italic* and `code`\n2. ~~Strikethrough~~ and [link](https://example.com)'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.strong')
      expect(result).toContain('_components.em')
      expect(result).toContain('_components.code')
      expect(result).toContain('_components.del')
      expect(result).toContain('_components.a')
    })

    test('GFM task list', async () => {
      const md = '- [ ] Buy groceries\n- [x] Clean the house\n- [ ] Write tests'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.input')
    })

    test('nested ordered and unordered lists', async () => {
      const md = '1. First\n   - Sub A\n   - Sub B\n2. Second'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
    })

    test('list after heading', async () => {
      const md = '## Steps\n\n1. Step one\n2. Step two\n3. Step three'
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.h2')
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
    })

    test('list with code block inside item', async () => {
      const md = [
        '1. Run this:',
        '',
        '   ```bash',
        '   npm install',
        '   ```',
        '',
        '2. Then this:',
        '',
        '   ```bash',
        '   npm start',
        '   ```',
      ].join('\n')
      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.pre')
      expect(result).toContain('_components.code')
    })
  })

  describe('preprocessing: escapeInvalidTagNames', () => {
    test('invalid HTML-like tags in text are escaped before compilation', async () => {
      const md = 'I <3 coding and use <Component /> in React.'
      const result = await compileFullPipeline(md)
      expect(result).toBeDefined()
    })

    test('valid JSX components pass through', async () => {
      const md = 'Here is <Box>content</Box> inline.'
      const result = await compileFullPipeline(md)
      expect(result).toContain('Box')
    })
  })

  describe('pure literal plugin interaction', () => {
    test('JSX with pure literal props compiles successfully', async () => {
      const md = '<Box color={"red"} size={42} />'
      const result = await compileFullPipeline(md)
      expect(result).toContain('"red"')
      expect(result).toContain('42')
    })

    test('JSX with non-pure expression props compiles safely', async () => {
      const md = '<Button onClick={handleClick}>Click me</Button>'
      const result = await compileFullPipeline(md)
      expect(result).toContain('{handleClick}')
      expect(result).toContain('Click me')
    })

    test('curly brace expressions in text become text nodes', async () => {
      const md = 'The value is {count} items.'
      const result = await compileFullPipeline(md)
      expect(result).toContain('{count}')
    })
  })

  describe('annotation plugin interaction', () => {
    test('text with file_citation annotation compiles to annotation element', async () => {
      const text = 'See the source for details.'
      const annotation = {
        type: 'file_citation',
        text: 'source',
        start_index: 8,
        end_index: 14,
        file_citation: { file_id: 'file-123' },
      }
      const result = await compileFullPipeline(text, [annotation])
      expect(result).toContain('_components.annotation')
      expect(result).toContain('data-annotation')
    })

    test('text without annotations renders normally', async () => {
      const text = 'Just a plain message.'
      const result = await compileFullPipeline(text, [])
      expect(result).not.toContain('_components.annotation')
    })
  })

  describe('realistic AI response patterns', () => {
    test('numbered list with bold titles and descriptions', async () => {
      const md = [
        "Sure! Here's how to use AI Builder:",
        '',
        '1. **Access AI Builder**  ',
        '   Go to the Interfaces tab.',
        '',
        '2. **Describe Your Customization**  ',
        '   Chat with the assistant.',
        '',
        '3. **Edit Code if Needed**  ',
        '   Modify the React TypeScript code.',
        '',
        'Let me know if you need more details!',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.strong')
    })

    test('heading followed by bullet points', async () => {
      const md = [
        '**Why AI Builder?**',
        '- It lets anyone build AI-powered interfaces easily.',
        '- Developers can refine the React code.',
        '- AI Builder auto-fixes code errors.',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.strong')
    })

    test('step-by-step guide with code blocks', async () => {
      const md = [
        'Follow these steps:',
        '',
        '1. Install the package:',
        '',
        '   ```bash',
        '   npm install @superinterface/react',
        '   ```',
        '',
        '2. Import the component:',
        '',
        '   ```tsx',
        '   import { SuperInterface } from "@superinterface/react"',
        '   ```',
        '',
        "That's it!",
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
      expect(result).toContain('_components.pre')
      expect(result).toContain('_components.code')
    })

    test('comparison response with table and list', async () => {
      const md = [
        'Here are the key differences:',
        '',
        '| Feature | Free | Pro |',
        '|---------|------|-----|',
        '| API calls | 100/day | Unlimited |',
        '| Support | Community | Priority |',
        '',
        'Benefits of upgrading:',
        '',
        '- **Unlimited API calls** for production apps',
        '- **Priority support** with faster response times',
        '- **Advanced analytics** to track usage',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.table')
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.strong')
    })

    test('mixed heading levels with nested lists', async () => {
      const md = [
        '# Getting Started',
        '',
        '## Prerequisites',
        '',
        '- Node.js 18+',
        '- npm or yarn',
        '',
        '## Installation',
        '',
        '1. Clone the repo',
        '2. Install dependencies:',
        '   - Run `npm install`',
        '   - Or `yarn install`',
        '3. Start the dev server',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.h1')
      expect(result).toContain('_components.h2')
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.code')
    })

    test('response with emoji and special characters', async () => {
      const md = [
        "Great question! Here's what you need to know \u{1F680}",
        '',
        '1. **Setup** \u{2705} — Configure your environment.',
        '2. **Deploy** \u{1F30D} — Push to your hosting platform.',
        '3. **Monitor** \u{1F4CA} — Keep an eye on metrics.',
        '',
        'Happy coding! \u{1F389}',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.strong')
      expect(result).toContain('\u{1F680}')
      expect(result).toContain('\u{2705}')
    })

    test('blockquote with list inside', async () => {
      const md = [
        '> **Note:** Follow these steps:',
        '>',
        '> 1. First step',
        '> 2. Second step',
        '> 3. Third step',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.blockquote')
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.li')
    })

    test('long response with multiple sections', async () => {
      const md = [
        '# API Reference',
        '',
        '## Authentication',
        '',
        'Use your API key in the `Authorization` header.',
        '',
        '## Endpoints',
        '',
        '### GET /users',
        '',
        'Returns a list of users.',
        '',
        '**Parameters:**',
        '',
        '- `limit` - Number of results (default: 10)',
        '- `offset` - Pagination offset',
        '',
        '### POST /users',
        '',
        'Create a new user.',
        '',
        '**Required fields:**',
        '',
        "1. `name` - The user's full name",
        '2. `email` - A valid email address',
        '',
        '---',
        '',
        '*See the full docs for more endpoints.*',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.h1')
      expect(result).toContain('_components.h2')
      expect(result).toContain('_components.h3')
      expect(result).toContain('_components.ul')
      expect(result).toContain('_components.ol')
      expect(result).toContain('_components.code')
      expect(result).toContain('_components.hr')
      expect(result).toContain('_components.em')
    })

    test('suggestions code block', async () => {
      const md = [
        'Here is some info.',
        '',
        '```suggestions',
        'Tell me more about feature X',
        'How do I configure Y?',
        '```',
      ].join('\n')

      const result = await compileFullPipeline(md)
      expect(result).toContain('_components.pre')
      expect(result).toContain('_components.code')
      expect(result).toContain('language-suggestions')
    })
  })
})
