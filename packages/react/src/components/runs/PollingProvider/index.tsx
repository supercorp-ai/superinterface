import { useState } from 'react'
import { PollingContext } from '@/contexts/runs/PollingContext'

export const PollingProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [isPollRefetching, setIsPollRefetching] = useState(false)

  return (
    <PollingContext.Provider
      value={{
        isPollRefetching,
        setIsPollRefetching,
      }}
    >
      {children}
    </PollingContext.Provider>
  )
}
