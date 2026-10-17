export const scriptTagId = ({
  currentScript,
}: {
  currentScript: HTMLScriptElement
}) => {
  const url = new URL(currentScript.src)
  const scriptTagIdMatch = url.pathname.match(/^\/script-tags\/(.+)$/)

  return scriptTagIdMatch ? scriptTagIdMatch[1] : null
}
