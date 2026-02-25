import { describe, expect, test } from 'vitest'
import { escapeInvalidTagNames } from './escapeInvalidTagNames'

describe('escapeInvalidTagNames', () => {
  test('valid HTML tags pass through unchanged', () => {
    expect(escapeInvalidTagNames('<div>hello</div>')).toBe('<div>hello</div>')
    expect(escapeInvalidTagNames('<span class="a">text</span>')).toBe(
      '<span class="a">text</span>',
    )
  })

  test('valid self-closing tags pass through', () => {
    expect(escapeInvalidTagNames('<br />')).toBe('<br />')
    expect(escapeInvalidTagNames('<img src="a.png" />')).toBe(
      '<img src="a.png" />',
    )
  })

  test('valid component names with dots pass through', () => {
    expect(escapeInvalidTagNames('<Table.Row />')).toBe('<Table.Row />')
  })

  test('valid component names with colons pass through', () => {
    expect(escapeInvalidTagNames('<xml:tag />')).toBe('<xml:tag />')
  })

  test('invalid tag names starting with numbers are escaped', () => {
    const result = escapeInvalidTagNames('<3heart>text</3heart>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).not.toContain('<3heart>')
  })

  test('invalid tag names with special characters are escaped', () => {
    const result = escapeInvalidTagNames('<tag!name>text</tag!name>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
  })

  test('mixed valid and invalid tags', () => {
    const input = '<div>Hello</div> and <3heart>love</3heart>'
    const result = escapeInvalidTagNames(input)
    expect(result).toContain('<div>')
    expect(result).toContain('</div>')
    expect(result).not.toContain('<3heart>')
  })

  test('text without tags passes through unchanged', () => {
    const text = 'Hello, this is plain text with no tags.'
    expect(escapeInvalidTagNames(text)).toBe(text)
  })

  test('markdown content passes through unchanged', () => {
    const md = '# Hello\n\n**bold** and *italic*'
    expect(escapeInvalidTagNames(md)).toBe(md)
  })
})
