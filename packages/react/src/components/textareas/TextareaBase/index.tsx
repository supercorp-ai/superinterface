import * as React from 'react'
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from 'react-textarea-autosize'

const BASE_TEXTAREA_STYLE = `.superinterface-textarea { min-height: inherit; height: 30px; }
.superinterface-textarea::placeholder { color: var(--gray-a10); }`

type TextareaBaseStyle = Omit<
  React.CSSProperties,
  'minHeight' | 'maxHeight' | 'height'
>

export type TextareaBaseProps = Omit<TextareaAutosizeProps, 'style'> & {
  style?: TextareaBaseStyle
}

export const TextareaBase = React.forwardRef<
  HTMLTextAreaElement,
  TextareaBaseProps
>(function TextareaBase({ style, className, ...rest }, ref) {
  const inlineStyle: TextareaAutosizeProps['style'] = {
    border: 0,
    outline: 0,
    boxSizing: 'border-box',
    resize: 'none',
    color: 'var(--gray-12)',
    flexGrow: 1,
    display: 'flex',
    ...(style ?? {}),
  }

  return (
    <>
      <style>{BASE_TEXTAREA_STYLE}</style>

      <TextareaAutosize
        ref={ref}
        className={`rt-reset superinterface-textarea ${className ?? ''}`}
        style={inlineStyle}
        {...rest}
      />
    </>
  )
})
