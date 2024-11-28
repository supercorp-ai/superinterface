export const scriptTagId = ({
  currentScript,
}: {
  currentScript: HTMLScriptElement
}) => {
  const url = new URL(currentScript.src)
  const scriptTagIdMatch = url.pathname.match(/^\/script-tags\/(.+)$/)

  if (!scriptTagIdMatch) {
    return null
  }

  return scriptTagIdMatch[1] ?? null
}
