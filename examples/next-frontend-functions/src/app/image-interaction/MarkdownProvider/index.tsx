import { useMemo } from 'react'
import { MarkdownProvider as SuperinterfaceMarkdownProvider } from '@superinterface/react'
import { DownloadableImg } from './DownloadableImg'

type Args = {
  children: React.ReactNode
}

export const MarkdownProvider = ({ children }: Args) => {
  const components = useMemo(
    () => ({
      // to apply our custom img component for image_file type
      MarkdownImg: DownloadableImg,
      // to apply the custom image to content text block that contains  markdown img syntax
      // eg: This is the output image\n\n![image](https://example.com/image.png)\n\nSome other text
      img: DownloadableImg,
    }),
    []
  )

  return (
    <SuperinterfaceMarkdownProvider
      // @ts-ignore-next-line
      components={components}
    >
      {children}
    </SuperinterfaceMarkdownProvider>
  )
}
