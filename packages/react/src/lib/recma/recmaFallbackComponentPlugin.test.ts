import { describe, expect, test } from 'vitest'
import { compile } from '@mdx-js/mdx'
import { recmaFallbackComponentPlugin } from './recmaFallbackComponentPlugin'

const compileMdx = async (mdx: string) =>
  String(
    await compile(mdx, {
      outputFormat: 'function-body',
      recmaPlugins: [recmaFallbackComponentPlugin],
      providerImportSource: '@mdx-js/react',
    }),
  )

describe('recmaFallbackComponentPlugin', () => {
  test('assigns a missing component a fallback that renders its tag', async () => {
    const code = await compileMdx('Hi <Missing />')

    expect(code).toContain('let _components = {')
    expect(code).toContain('}, {Missing} = _components;')
    expect(code).toContain(
      'if (!Missing) Missing = _missingMdxReference("Missing", true);',
    )
    expect(code).toContain(
      'if (component) return function (props) {\n    return "<" + id + ("></" + (id + ">"));\n  };',
    )
  })

  test('makes a component destructuring of an object assignable', async () => {
    const code = await compileMdx('<Missing />')

    expect(code).toContain('let {Missing} = {')
    expect(code).toContain(
      'if (!Missing) Missing = _missingMdxReference("Missing", true);',
    )
  })

  test('makes only top-level destructurings assignable', async () => {
    const code = await compileMdx(
      'export const { outer } = { outer: () => { const { inner } = {}; return inner } }',
    )

    // The plugin skips the children of a declaration it rewrote, so the
    // destructuring nested in its initializer is not visited.
    expect(code).toContain('let {outer} = {')
    expect(code).toContain('const {inner} = {};')
  })

  test('leaves a missing check nested in a rewritten one as written', async () => {
    const code = await compileMdx(
      "export const check = () => { let outer; if (!outer) _missingMdxReference((() => { let inner; if (!inner) _missingMdxReference('inner', true); return inner })()) }",
    )

    // The plugin skips the children of a check it rewrote.
    expect(code).toContain('if (!outer) outer = _missingMdxReference((() => {')
    expect(code).toContain("if (!inner) _missingMdxReference('inner', true);")
  })

  test('leaves declarations and checks that MDX did not generate as written', async () => {
    const code = await compileMdx(
      [
        'export const { a } = other',
        'export const { b } = makeB()',
        'export const loop = (items) => { for (const { x } of items) {} }',
        'export const negate = (y) => { if (-y) y() }',
        'export const early = (y) => { if (!y) return }',
        'export const assign = (y) => { if (!y) y = 1 }',
        'export const method = (y) => { if (!y) y.call() }',
        'export const other = (y) => { if (!y) somethingElse() }',
      ].join('\n\n'),
    )

    expect(code).toContain('const {a} = other;')
    expect(code).toContain('const {b} = makeB();')
    expect(code).toContain('for (const {x} of items) {}')
    expect(code).toContain('if (-y) y();')
    expect(code).toContain('if (!y) return;')
    expect(code).toContain('if (!y) y = 1;')
    expect(code).toContain('if (!y) y.call();')
    expect(code).toContain('if (!y) somethingElse();')
  })
})
