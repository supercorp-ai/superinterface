import OpenAI from 'openai'
import { visit, SKIP } from 'unist-util-visit'

export const remarkAnnotation = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  return () => {
    return (tree: any) => {
      visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
        if (content.text.annotations.length > 0) {
          content.text.annotations.forEach((annotation) => {
            if (!node.position?.start?.offset) return
            if (!node.position?.end?.offset) return

            if (node.position.start.offset > annotation.start_index) {
              return
            }

            if (node.position.end.offset < annotation.end_index) {
              return
            }

            const beforeStart = node.position.start.offset
            const beforeEnd = annotation.start_index
            const annotationStart = annotation.start_index
            const annotationEnd = annotation.end_index
            const afterStart = annotation.end_index
            const afterEnd = node.position.end.offset

            const before = node.value.slice(0, annotation.start_index - node.position.start.offset)
            const annotatedText = node.value.slice(
              annotation.start_index - node.position.start.offset,
              annotation.end_index - node.position.start.offset
            )
            const after = node.value.slice(annotation.end_index - node.position.start.offset)

            const newNodes = []

            if (before) {
              newNodes.push({
                type: 'text',
                value: before,
                position: {
                  start: { offset: beforeStart },
                  end: { offset: beforeEnd }
                }
              })
            }

            newNodes.push({
              value: annotatedText,
              data: {
                hName: 'annotation',
                hProperties: {
                  annotation,
                },
              },
              position: {
                start: { offset: annotationStart },
                end: { offset: annotationEnd }
              },
            })

            if (after) {
              newNodes.push({
                type: 'text',
                value: after,
                position: {
                  start: { offset: afterStart },
                  end: { offset: afterEnd }
                }
              })
            }

            parent.children.splice(index, 1, ...newNodes)
          })

          return SKIP
        }

        return
      })
    }
  }
}
