// From: https://github.com/streamich/react-use/blob/ade8d3905f544305515d010737b4ae604cc51024/src/misc/util.ts
export const noop = () => {}

// Only used with a PermissionStatus, which is always an EventTarget.
export function on<T extends Window | Document | HTMLElement | EventTarget>(
  obj: T,
  ...args: Parameters<T['addEventListener']> | [string, Function | null, ...any]
): void {
  obj.addEventListener(...(args as Parameters<HTMLElement['addEventListener']>))
}

export function off<T extends Window | Document | HTMLElement | EventTarget>(
  obj: T,
  ...args:
    | Parameters<T['removeEventListener']>
    | [string, Function | null, ...any]
): void {
  obj.removeEventListener(
    ...(args as Parameters<HTMLElement['removeEventListener']>),
  )
}
