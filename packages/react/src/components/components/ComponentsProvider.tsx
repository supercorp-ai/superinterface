import { useMemo } from 'react'
import { ComponentsContext } from '@/contexts/components/ComponentsContext'
import { useComponents } from '@/hooks/components/useComponents'
import { merge } from '@/lib/misc/merge'

export const ComponentsProvider = ({
  children,
  ...rest
}: {
  children: React.ReactNode
}) => {
  const prevComponents = useComponents()

  const value = useMemo(() => (
    merge(prevComponents, rest)
  ), [rest, prevComponents])

  return (
    <ComponentsContext.Provider
      value={value}
    >
      {children}
    </ComponentsContext.Provider>
  )
}
