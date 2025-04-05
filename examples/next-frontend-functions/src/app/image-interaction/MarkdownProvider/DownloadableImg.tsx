interface DownloadableImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

export const DownloadableImg = ({
  src,
  alt: altProp,
  ...props
}: DownloadableImageProps) => {
  const alt = altProp || 'Output image file'

  const handleDownload = () => {
    if (typeof window === 'undefined') return

    const link = document.createElement('a')
    link.href = src
    link.download = alt || 'image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div style={{ paddingBottom: '12px', position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          cursor: 'pointer',
          borderRadius: '8px',
          border: '1ox solid red',
        }}
        {...props}
      />
      <button
        style={{
          position: 'absolute',
          bottom: '0',
          right: '10px',
          background: '#ccc',
          padding: '2px 10px',
          color: 'blue',
        }}
        onClick={handleDownload}
      >
        Download
      </button>
    </div>
  )
}
