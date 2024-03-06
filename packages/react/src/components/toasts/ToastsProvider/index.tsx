import { useState, useCallback } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { ToastsContext } from '@/contexts/toasts/ToastsContext'
import { CustomToast } from './CustomToast'
import { Toast as ToastType } from '@/types'

export const ToastsProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [toasts, setToasts] = useState<ToastType[]>([])
  const addToast = useCallback((toast: ToastType) => (
    setToasts((prevToasts) => [
      ...prevToasts,
      toast,
    ])
  ), [])

  return (
    <ToastsContext.Provider
      value={{
        toasts,
        addToast,
      }}
    >
      <Toast.Provider>
        {children}

        {Array.from(toasts).map((toast: ToastType, index: number) => (
          <CustomToast
            key={index}
            toast={toast}
          />
        ))}

        <Toast.Viewport
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-5)',
            gap: 'var(--space-3)',
            width: '390px',
            maxWidth: '100vw',
            margin: 0,
            listStyle: 'none',
            zIndex: 99999999999999,
            outline: 'none',
          }}
        />
      </Toast.Provider>
    </ToastsContext.Provider>
  )
}
