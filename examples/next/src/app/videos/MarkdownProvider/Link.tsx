import {
  useMarkdownContext,
} from '@superinterface/react'

const isYoutube = ({ url }: { url: string }): boolean => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com' || parsedUrl.hostname === 'youtu.be'
  } catch (e) {
    return false
  }
}


export const Link = ({
  children,
  href,
  markdownContext,
}: {
  children?: React.ReactNode,
  href?: string,
  markdownContext: ReturnType<typeof useMarkdownContext>
}) => {
  if (!href || !isYoutube({ url: href })) {
    return markdownContext.components.a({ children, href })
  }

  return (
    <iframe
      width="560"
      height="315"
      src={href}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  )
}
