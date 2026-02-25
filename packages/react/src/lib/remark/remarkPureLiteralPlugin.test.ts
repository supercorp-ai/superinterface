import { describe, expect, test } from 'vitest'
import { compile } from '@mdx-js/mdx'
import { remarkPureLiteralPlugin } from './remarkPureLiteralPlugin'

const compileMdx = async (md: string) =>
  String(
    await compile(md, {
      outputFormat: 'function-body',
      remarkPlugins: [remarkPureLiteralPlugin],
    }),
  )

describe('remarkPureLiteralPlugin', () => {
  test('pure string literal attribute passes through', async () => {
    const result = await compileMdx(`<Box color={"red"} />`)
    expect(result).toContain('"red"')
  })

  test('pure number literal attribute passes through', async () => {
    const result = await compileMdx(`<Box size={42} />`)
    expect(result).toContain('42')
  })

  test('pure boolean literal attribute passes through', async () => {
    const result = await compileMdx(`<Box active={true} />`)
    expect(result).toContain('true')
  })

  test('pure object literal attribute passes through', async () => {
    const result = await compileMdx(`<Box style={{ color: "red" }} />`)
    expect(result).toContain('color')
    expect(result).toContain('"red"')
  })

  test('pure array literal attribute passes through', async () => {
    const result = await compileMdx(`<Box items={[1, 2, 3]} />`)
    expect(result).toContain('[1, 2, 3]')
  })

  test('non-pure expression attribute is converted to string', async () => {
    const result = await compileMdx(`<Box onClick={handleClick} />`)
    expect(result).toContain('{handleClick}')
  })

  test('function call expression is converted to string', async () => {
    const result = await compileMdx(`<Box value={getValue()} />`)
    expect(result).toContain('{getValue()}')
  })

  test('flow expressions are converted to text nodes', async () => {
    const result = await compileMdx(`{someVariable}`)
    expect(result).toContain('{someVariable}')
  })

  test('template literal without expressions passes through', async () => {
    const result = await compileMdx('<Box label={`hello`} />')
    expect(result).toContain('hello')
  })
})
