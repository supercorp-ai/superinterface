import { useEffect, useRef } from 'react'

export const useInterval = (callback: Function, delay: number) => {
  const savedCallback = useRef<Function>(callback)

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    const interval = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(interval)
  }, [delay])
}
