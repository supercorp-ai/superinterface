
export const currentScriptSuperinterfaceContext = ({
  currentScript,
}: {
  currentScript: HTMLScriptElement
}) => {
  const url = new URL(currentScript.src)

  const {
    baseUrl,
    ...variables
  } = Object.fromEntries(url.searchParams.entries())

  return {
    ...(baseUrl ? { baseUrl } : {}),
    variables,
  }
}
