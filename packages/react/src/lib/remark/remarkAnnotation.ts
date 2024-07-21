import OpenAI from 'openai'
import { isNumber } from 'radash'
import type { Literal } from 'unist'
// @ts-ignore-next-line
import flatMap from 'unist-util-flatmap'

type Node = Literal & {
  value: string
}

export const remarkAnnotation = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  return () => {
    return (tree: any) => {
      flatMap(tree, (node: Node) => {
        if (node.type !== 'text') {
          return [node]
        }

        if (!content.text?.annotations?.length) {
          return [node]
        }

        if (!node.position) {
          return [node]
        }

        const nodeStart = node.position.start.offset

        if (!isNumber(nodeStart)) {
          return [node]
        }

        const nodeEnd = node.position.end.offset

        if (!isNumber(nodeEnd)) {
          return [node]
        }

        const newNodes: Node[] = []

        const sortedAnnotations = content.text.annotations.sort((a, b) => a.start_index - b.start_index)

        let lastProcessedIndex = nodeStart

        sortedAnnotations.forEach((annotation) => {
          const annotationStart = annotation.start_index
          const annotationEnd = annotation.end_index

          if (nodeEnd < annotationStart || nodeStart > annotationEnd) {
            return
          }

          const startIndex = Math.max(nodeStart, annotationStart)
          const endIndex = Math.min(nodeEnd, annotationEnd)

          if (lastProcessedIndex < startIndex) {
            newNodes.push({
              type: 'text',
              value: node.value.slice(lastProcessedIndex - nodeStart, startIndex - nodeStart),
              position: {
                start: {
                  line: node.position!.start.line,
                  column: node.position!.start.column,
                  offset: lastProcessedIndex,
                },
                end: {
                  line: node.position!.end.line,
                  column: node.position!.end.column,
                  offset: startIndex,
                },
              },
            })
          }

          newNodes.push({
            type: 'annotation',
            value: node.value.slice(startIndex - nodeStart, endIndex - nodeStart),
            position: {
              start: {
                line: node.position!.start.line,
                column: node.position!.start.column,
                offset: startIndex,
              },
              end: {
                line: node.position!.end.line,
                column: node.position!.end.column,
                offset: endIndex,
              },
            },
            data: {
              hName: 'annotation',
              hProperties: {
                annotation,
              },
            },
          })

          lastProcessedIndex = endIndex
        })

        if (lastProcessedIndex < nodeEnd) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastProcessedIndex - nodeStart, nodeEnd - nodeStart),
            position: {
              start: {
                line: node.position!.start.line,
                column: node.position!.start.column,
                offset: lastProcessedIndex,
              },
              end: {
                line: node.position!.end.line,
                column: node.position!.end.column,
                offset: nodeEnd,
              },
            },
          })
        }

        return newNodes
      })
    }
  }
}
