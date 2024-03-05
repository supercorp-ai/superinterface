import { forwardRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

const UPSCALE_RATIO = 16 / 14

type Props = React.ComponentProps<typeof TextareaAutosize>

export const TextareaBase = forwardRef(function TextareaBase(props: Props, ref) {
  return (
    <>
      <style>
        {`.superinterface-textarea { min-height: inherit; height: 30px; }
.superinterface-textarea::placeholder { color: var(--gray-a10); }`}
      </style>

      <TextareaAutosize
        // @ts-ignore-next-line
        ref={ref}
        className="rt-reset superinterface-textarea"
        style={{
          border: 0,
          outline: 0,
          boxSizing: 'border-box',
          resize: 'none',
          color: 'var(--gray-12)',
          fontSize: `${14 * UPSCALE_RATIO}px`,
          lineHeight: `${24 * UPSCALE_RATIO}px`,
          transform: `scale(${1 / UPSCALE_RATIO})`,
          margin: `0 ${(-100 * UPSCALE_RATIO + 100) / 2}%`,
          width: `${100 * UPSCALE_RATIO}%`,
          maxWidth: `${100 * UPSCALE_RATIO}%`,
          flexGrow: 1,
          display: 'flex',
        }}
        {...props}
      />
    </>
  )
})
