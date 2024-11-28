import { scriptTagId as getScriptTagId } from './scriptTagId'

export const manualElement = ({
  currentScript,
}: {
  currentScript: HTMLScriptElement
}) => {
  const scriptTagId = getScriptTagId({ currentScript })

  if (!scriptTagId) {
    return null
  }

  return document.querySelector(`.superinterface-root[data-script-tag-id="${scriptTagId}"]`)
}
