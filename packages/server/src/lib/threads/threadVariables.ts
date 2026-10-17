// The variables a message request carries besides the message itself. They
// become the metadata of the thread and message it creates, each value
// serialized to a string.
export type ThreadVariables = Record<string, unknown>
