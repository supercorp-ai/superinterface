// Name of the MCP tool that performs computer use actions.
export const COMPUTER_CALL_TOOL_NAME = 'computer_call'

// Computer use actions can be slow (page loads, typing), so allow 5 minutes.
export const COMPUTER_CALL_TIMEOUT_MS = 5 * 60 * 1000

// Action used to capture the screen when an action returns no image.
export const SCREENSHOT_ACTION = { type: 'screenshot' }

// Computer use MCP servers return PNG screenshots.
export const SCREENSHOT_MEDIA_TYPE = 'image/png'
