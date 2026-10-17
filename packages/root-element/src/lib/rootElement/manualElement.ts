import { scriptTagId as getScriptTagId } from './scriptTagId'

export const manualElement = ({
  currentScript,
}: {
  currentScript: HTMLScriptElement
}) => {
  const scriptTagId = getScriptTagId({ currentScript })

  return scriptTagId
    ? document.querySelector(
        `.superinterface-root[data-script-tag-id="${scriptTagId}"]`,
      )
    : null
}
