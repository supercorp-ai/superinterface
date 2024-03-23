export const enqueueJson = ({
  controller,
  value,
}: {
  controller: ReadableStreamDefaultController
  value: any
}) => (
  controller.enqueue(new TextEncoder().encode(JSON.stringify(value)))
)
