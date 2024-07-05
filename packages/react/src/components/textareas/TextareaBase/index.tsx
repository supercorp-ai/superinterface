import { forwardRef } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

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
          flexGrow: 1,
          display: 'flex',
        }}
        {...props}
      />
    </>
  )
})
