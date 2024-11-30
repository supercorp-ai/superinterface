import { isValidSuperinterfaceContext } from './isValidSuperinterfaceContext'
import {
  currentScriptSuperinterfaceContext as getCurrentScriptSuperinterfaceContext,
} from './currentScriptSuperinterfaceContext'
import { windowSuperinterfaceContext } from './windowSuperinterfaceContext'

declare const INJECTED_SUPERINTERFACE_CONTEXT: Record<string, any> | undefined

export const superinterfaceContext = ({
  currentScript,
}: {
  currentScript: HTMLOrSVGScriptElement | null
}) => {
  if (typeof INJECTED_SUPERINTERFACE_CONTEXT !== 'undefined') {
    return INJECTED_SUPERINTERFACE_CONTEXT
  }

  if (currentScript instanceof HTMLScriptElement) {
    const currentScriptSuperinterfaceContext = getCurrentScriptSuperinterfaceContext({ currentScript })

    if (isValidSuperinterfaceContext({ superinterfaceContext: currentScriptSuperinterfaceContext })) {
      return currentScriptSuperinterfaceContext
    }
  }

  const windowSuperinterface = (window as any).superinterface

  if (windowSuperinterface) {
    return windowSuperinterfaceContext({
      windowSuperinterface,
    })
  }

  throw new Error('Superinterface context is not set up. Please read Superinterface integration docs.')
}
