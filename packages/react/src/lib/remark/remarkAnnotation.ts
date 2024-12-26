import OpenAI from 'openai'
import { isNumber } from 'radash'
import type { Node, Literal, Position } from 'unist'
import type { Text, Link } from 'mdast'
// @ts-ignore-next-line
import flatMap from 'unist-util-flatmap'

interface AnnotationNode extends Literal {
  type: 'annotation'
  value: string
  position?: Position
  data: {
    hName: 'annotation'
    hProperties: {
      ['data-annotation']: string
    }
  }
}

const sortedAnnotations = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) =>
  content.text.annotations.sort((a, b) => a.start_index - b.start_index)

export const remarkAnnotation = ({
  content,
}: {
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}) => {
  return () => {
    return (tree: any) => {
      flatMap(tree, (node: Node) => {
        // Process text and link nodes
        if (node.type === 'text' || node.type === 'link') {
          return processNodeWithAnnotations({ node, content })
        } else {
          // Return other nodes as-is
          return [node]
        }
      })
    }
  }
}

const processNodeWithAnnotations = ({
  node,
  content,
}: {
  node: Node
  content: OpenAI.Beta.Threads.Messages.TextContentBlock
}): Node[] => {
  if (!content.text?.annotations?.length) {
    return [node]
  }

  if (!node.position) {
    return [node]
  }

  const annotations = sortedAnnotations({ content })

  if (node.type === 'text') {
    // node is a Text node
    return processTextNode({ node: node as Text, annotations })
  } else if (node.type === 'link') {
    // node is a Link node
    const linkNode = node as Link
    // Process link node's children
    linkNode.children = flatMap(linkNode.children, (childNode: Node) => {
      if (childNode.type === 'text') {
        return processTextNode({ node: childNode as Text, annotations })
      } else {
        return [childNode]
      }
    })
    return [linkNode]
  } else {
    // Return node as-is
    return [node]
  }
}

const processTextNode = ({
  node,
  annotations,
}: {
  node: Text
  annotations: any[]
}): Node[] => {
  if (!node.position || !node.value) {
    return [node]
  }

  const nodeStart = node.position.start.offset!
  const nodeEnd = node.position.end.offset!

  if (!isNumber(nodeStart) || !isNumber(nodeEnd)) {
    return [node]
  }

  const newNodes: Node[] = []
  let lastIndex = nodeStart

  annotations.forEach((annotation) => {
    const annotationStart = annotation.start_index
    const annotationEnd = annotation.end_index

    if (nodeEnd <= annotationStart || nodeStart >= annotationEnd) {
      return
    }

    const start = Math.max(nodeStart, annotationStart)
    const end = Math.min(nodeEnd, annotationEnd)

    if (lastIndex < start) {
      newNodes.push(createTextNode({ node, startOffset: lastIndex, endOffset: start }))
    }

    newNodes.push(
      createAnnotationNode({
        node,
        startOffset: start,
        endOffset: end,
        annotation,
      })
    )
    lastIndex = end
  })

  if (lastIndex < nodeEnd) {
    newNodes.push(createTextNode({ node, startOffset: lastIndex, endOffset: nodeEnd }))
  }

  return newNodes
}

const createTextNode = ({
  node,
  startOffset,
  endOffset,
}: {
  node: Text
  startOffset: number
  endOffset: number
}): Text => {
  const valueStart = startOffset - node.position!.start.offset!
  const valueEnd = endOffset - node.position!.start.offset!

  return {
    type: 'text',
    value: node.value.slice(valueStart, valueEnd),
    position: {
      start: {
        ...node.position!.start,
        offset: startOffset,
      },
      end: {
        ...node.position!.end,
        offset: endOffset,
      },
    },
  }
}

const createAnnotationNode = ({
  node,
  startOffset,
  endOffset,
  annotation,
}: {
  node: Text
  startOffset: number
  endOffset: number
  annotation: any
}): AnnotationNode => {
  const valueStart = startOffset - node.position!.start.offset!
  const valueEnd = endOffset - node.position!.start.offset!

  return {
    type: 'annotation',
    value: node.value.slice(valueStart, valueEnd),
    position: {
      start: {
        ...node.position!.start,
        offset: startOffset,
      },
      end: {
        ...node.position!.end,
        offset: endOffset,
      },
    },
    data: {
      hName: 'annotation',
      hProperties: {
        ['data-annotation']: JSON.stringify(annotation),
      },
    },
  }
}
