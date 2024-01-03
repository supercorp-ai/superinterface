import _ from 'lodash'
import { useRef, useEffect, useCallback } from 'react'

export const useThrottledEffect = (cb: Function, delay: number, additionalDeps: any[]) => {
  const cbRef = useRef(cb)

  const throttledCb = useCallback(
    _.throttle((...args: any[]) => cbRef.current(...args), delay, {
      leading: true,
      trailing: true,
    }),
    [delay]
  )
  useEffect(() => {
    cbRef.current = cb
  })
  // set additionalDeps to execute effect, when other values change (not only on delay change)
  useEffect(throttledCb, [throttledCb, ...additionalDeps])
}
