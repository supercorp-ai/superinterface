const isValidTagName = (tagName: string): boolean => (
  /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(tagName)
)

export const escapeInvalidTagNames = (markdown: string): string => (
  markdown.replace(/<([^\s>/]+)([^>]*)>/g, (fullMatch, tagName) => (
    isValidTagName(tagName) ? fullMatch : fullMatch.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  ))
)
