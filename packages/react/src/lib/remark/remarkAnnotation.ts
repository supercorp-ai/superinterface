import OpenAI from 'openai'
import { isNumber } from 'radash'
import type { Node, Literal, Position } from 'unist'
import type { Text, Link } from 'mdast'
// @ts-ignore-next-line
import flatMap from 'unist-util-flatmap'

interface AnnotationNode extends Literal {
  type: 'annotation'
  value: string
  children?: Node[]
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
        if (node.type === 'text' || node.type === 'link') {
          return processNodeWithAnnotations({ node, content })
        }
        return [node]
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
  if (!content.text?.annotations?.length || !node.position) {
    return [node]
  }
  const annotations = sortedAnnotations({ content })

  if (node.type === 'text') {
    return processTextNode({ node: node as Text, annotations })
  } else if (node.type === 'link') {
    const linkNode = node as Link

    linkNode.children = flatMap(linkNode.children, (child: Node) => {
      if (child.type === 'text') {
        return processTextNode({ node: child as Text, annotations })
      }
      return [child]
    })

    if (!linkNode.position) return [linkNode]

    // Compute the total label length from all text children.
    let labelLength = 0
    for (const child of linkNode.children) {
      if (child.type === 'text' && typeof (child as Text).value === 'string') {
        labelLength += (child as Text).value.length
      }
    }

    // The raw markdown syntax for a link is: [label](url)
    // Offsets:
    //   1 char for '[',
    //   labelLength for the label,
    //   1 char for ']',
    //   1 char for '('.
    // So the URL portion starts at:
    const linkStart = linkNode.position.start.offset!
    const urlStartOffset = linkStart + 1 + labelLength + 1 + 1  // = linkStart + labelLength + 3
    // And the URL portion ends at the link node’s end offset minus 1 (to drop the closing ')'):
    const urlEndOffset = linkNode.position.end.offset! - 1

    const matchingURLAnnotations = annotations.filter(annotation =>
      annotation.start_index >= urlStartOffset && annotation.end_index <= urlEndOffset
    )

    if (matchingURLAnnotations.length > 0) {
      const annotation = matchingURLAnnotations[0]
      const newAnnotationNode: AnnotationNode = {
        type: 'annotation',
        value: linkNode.url,
        children: linkNode.children,
        position: {
          start: { ...linkNode.position.start, offset: urlStartOffset },
          end: { ...linkNode.position.end, offset: urlEndOffset },
        },
        data: {
          hName: 'annotation',
          hProperties: {
            ['data-annotation']: JSON.stringify(annotation),
          },
        },
      }
      return [newAnnotationNode]
    } else {
      return [linkNode]
    }
  } else {
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
  if (!node.position || !node.value) return [node]
  const nodeStart = node.position.start.offset!
  const nodeEnd = node.position.end.offset!
  if (!isNumber(nodeStart) || !isNumber(nodeEnd)) return [node]

  const newNodes: Node[] = []
  let lastIndex = nodeStart

  annotations.forEach((annotation) => {
    const annotationStart = annotation.start_index
    const annotationEnd = annotation.end_index
    if (nodeEnd <= annotationStart || nodeStart >= annotationEnd) return
    const start = Math.max(nodeStart, annotationStart)
    const end = Math.min(nodeEnd, annotationEnd)
    if (lastIndex < start) {
      newNodes.push(createTextNode({ node, startOffset: lastIndex, endOffset: start }))
    }
    newNodes.push(createAnnotationNode({ node, startOffset: start, endOffset: end, annotation }))
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
      start: { ...node.position!.start, offset: startOffset },
      end: { ...node.position!.end, offset: endOffset },
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
      start: { ...node.position!.start, offset: startOffset },
      end: { ...node.position!.end, offset: endOffset },
    },
    data: {
      hName: 'annotation',
      hProperties: { ['data-annotation']: JSON.stringify(annotation) },
    },
  }
}
