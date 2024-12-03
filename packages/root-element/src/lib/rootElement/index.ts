import { manualElement as getManualElement } from './manualElement'
import { scriptTagId as getScriptTagId } from './scriptTagId'

const appendWithStyles = ({
  appendElement,
  currentScript,
}: {
  appendElement: ({ element }: { element: HTMLElement }) => void
  currentScript: HTMLScriptElement | null
}) => {
  const style = document.createElement('style')

  style.innerHTML = `.superinterface-root .radix-themes {
   display: flex;
   flex-grow: 1;
   min-height: inherit;
   z-index: auto;
 }

 .superinterface-root {
   display: flex;
   flex-grow: 1;
   max-height: 100dvh;
 }`

  document.head.appendChild(style)

  const element = document.createElement('div')
  element.classList.add('superinterface-root')

  if (currentScript) {
    const scriptTagId = getScriptTagId({ currentScript })

    if (scriptTagId) {
      element.dataset.scriptTagId = scriptTagId
    }
  }

  appendElement({ element })
  return element
}

const appendToBody = ({
  currentScript,
}: {
  currentScript?: HTMLScriptElement | null
} = {}) => (
  appendWithStyles({
    appendElement: ({ element }) => document.body.appendChild(element),
    currentScript: currentScript ?? null,
  })
)

export const rootElement = ({
  currentScript,
}: {
  currentScript: HTMLOrSVGScriptElement | null
}) => {
  if (currentScript instanceof HTMLScriptElement) {
    const manualElement = getManualElement({ currentScript })

    if (manualElement) {
      return manualElement
    }

    const isInBody = document.body.contains(currentScript)

    if (!isInBody) {
      return appendToBody({ currentScript })
    }

    const parentNode = currentScript.parentNode

    if (!parentNode) {
      return appendToBody({ currentScript })
    }

    return appendWithStyles({
      appendElement: ({ element }) => parentNode.insertBefore(element, currentScript.nextSibling),
      currentScript,
    })
  }

  return appendToBody()
}
