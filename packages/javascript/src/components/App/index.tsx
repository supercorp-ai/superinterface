import {
  AudioThreadDialog,
  ThreadDialog,
} from '@superinterface/react'
import { Providers } from '@/components/Providers'
import './styles.css'

export const App = () => {
  const superinterfaceContext = (window as any).superinterface

  if (!superinterfaceContext) {
    throw new Error('window.superinterface is not set up. Please read Superinterface integration docs.')
  }

  return (
    <Providers>
      {superinterfaceContext.surface === 'audioThreadDialog' ? (
        <AudioThreadDialog />
      ) : (
        <ThreadDialog />
      )}
    </Providers>
  )
}
