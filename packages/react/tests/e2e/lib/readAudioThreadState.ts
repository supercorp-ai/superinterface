type Button = {
  element: HTMLButtonElement
  color: string
  variant: string
  disabled: boolean
  hasIcon: boolean
}

// The status the user can tell apart from the status line and the button.
const statusOf = ({
  statusTexts,
  buttons,
}: {
  statusTexts: string[]
  buttons: Button[]
}) => {
  if (statusTexts[0] === 'Start speaking') return 'recording'
  if (statusTexts[0] === 'Listening') return 'playing'
  if (statusTexts[0] === 'Thinking') return 'thinking'
  if (statusTexts[0] !== 'Click the button below to activate') return 'unknown'

  const [button] = buttons
  if (button?.color !== 'red') return 'playerPaused'
  if (button.hasIcon) return 'recorderPaused'

  return 'idle'
}

// What an AudioThread shows the user: the status line (its texts live in a
// CSS animation, so they are read from the <style> that drives it) and the
// action buttons, described by their look since they have no labels.
export const readAudioThreadState = ({
  container,
}: {
  container: HTMLElement
}) => {
  const styles = Array.from(container.querySelectorAll('style'))
    .map((style) => style.textContent ?? '')
    .filter((css) => css.includes('.status-messages-texts:after'))
  const statusTexts = styles.flatMap((css) =>
    Array.from(css.matchAll(/content: "([^"]*)"/g)).map((match) => match[1]),
  )

  const buttons: Button[] = Array.from(
    container.querySelectorAll('button'),
  ).map((button) => ({
    element: button,
    color: button.getAttribute('data-accent-color') ?? '',
    variant:
      Array.from(button.classList)
        .find((name) => name.startsWith('rt-variant-'))
        ?.replace('rt-variant-', '') ?? '',
    disabled: button.disabled,
    hasIcon: !!button.querySelector('svg'),
  }))

  return {
    status: statusOf({ statusTexts, buttons }),
    statusTexts,
    buttons,
  }
}
