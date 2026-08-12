import { isNumber } from 'radash'
import type { Node, Literal, Position } from 'unist'
import type { Text, Link, Image } from 'mdast'
import type { MessageAnnotation, TextContentBlock } from '@/types'
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

const markerPattern = /^【[^】]+】$/

/**
 * Detect broken annotations: a `file_citation` annotation's `text` should
 * always be a complete 【...】 marker (per OpenAI Assistants API docs). If
 * any `file_citation` has non-marker text, the response has broken
 * annotations (Azure bug) and we strip unmatched markers.
 *
 * IMPORTANT: this check is scoped to `file_citation` only. `file_path`
 * annotations — including those that supercompat maps from the Responses API
 * `container_file_citation` shape — legitimately carry an empty `text` and
 * are matched by `start_index` / `end_index` against the URL substring inside
 * a markdown link. Treating their empty `text` as "broken" would filter
 * every code-interpreter file annotation out of the message and leave raw
 * `sandbox:` hrefs in the rendered output.
 */
const hasBrokenAnnotations = (annotations: MessageAnnotation[]) =>
  annotations.length > 0 &&
  annotations.some(
    (a) => a.type === 'file_citation' && !markerPattern.test(a.text),
  )

const sortedAnnotations = ({ content }: { content: TextContentBlock }) => {
  const annotations = content.text.annotations

  // If all annotations are valid markers (OpenAI format), use as-is
  if (!hasBrokenAnnotations(annotations)) {
    return annotations.sort((a, b) => a.start_index - b.start_index)
  }

  // Broken annotations detected (Azure bug): only keep valid marker
  // file_citations AND any non-file_citation annotations (e.g. file_path
  // whose `text` is intentionally empty and is matched by position).
  return annotations
    .filter((a) => a.type !== 'file_citation' || markerPattern.test(a.text))
    .sort((a, b) => a.start_index - b.start_index)
}

export const remarkAnnotation = ({
  content,
}: {
  content: TextContentBlock
}) => {
  const broken = hasBrokenAnnotations(content.text?.annotations ?? [])

  return () => {
    return (tree: any) => {
      flatMap(tree, (node: Node) => {
        if (
          node.type === 'text' ||
          node.type === 'link' ||
          node.type === 'image'
        ) {
          const result = processNodeWithAnnotations({ node, content })

          // If broken annotations detected, strip leftover 【...】 markers from text nodes
          if (broken) {
            return result.flatMap((n: Node) => {
              if (n.type === 'text') {
                return stripMarkers(n as Text)
              }
              return [n]
            })
          }

          return result
        }
        return [node]
      })

      // If broken annotations detected, append invalid annotations as nodes at the end.
      // Scoped to `file_citation` only — `file_path` annotations have empty
      // text by design and are processed inline by start_index/end_index
      // against URL ranges, never by marker-text matching.
      if (broken) {
        const invalidAnnotations = content.text.annotations.filter(
          (a) => a.type === 'file_citation' && !markerPattern.test(a.text),
        )
        if (invalidAnnotations.length > 0) {
          const annotationNodes: AnnotationNode[] = invalidAnnotations.map(
            (annotation) => ({
              type: 'annotation' as const,
              value: '',
              data: {
                hName: 'annotation' as const,
                hProperties: {
                  ['data-annotation']: JSON.stringify(annotation),
                },
              },
            }),
          )
          // Append a paragraph containing all invalid annotation nodes
          tree.children.push({
            type: 'paragraph',
            children: annotationNodes,
          })
        }
      }
    }
  }
}

/**
 * Strip 【...】 markers from a text node, splitting it into parts.
 * Used when Azure returns broken annotations and some markers have no valid annotation.
 */
const stripMarkers = (node: Text): Node[] => {
  if (!node.value.includes('【')) return [node]

  const parts = node.value.split(/【[^】]+】/)
  if (parts.length === 1) return [node] // no markers found

  const nodes: Node[] = []
  for (const part of parts) {
    if (part) {
      nodes.push({
        type: 'text',
        value: part,
        position: node.position,
      } as Text)
    }
  }
  return nodes.length > 0
    ? nodes
    : [{ type: 'text', value: '', position: node.position } as Text]
}

const processNodeWithAnnotations = ({
  node,
  content,
}: {
  node: Node
  content: TextContentBlock
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
    const urlStartOffset = linkStart + 1 + labelLength + 1 + 1 // = linkStart + labelLength + 3
    // And the URL portion ends at the link node’s end offset minus 1 (to drop the closing ')'):
    const urlEndOffset = linkNode.position.end.offset! - 1

    const matchingURLAnnotations = annotations.filter(
      (annotation) =>
        annotation.start_index >= urlStartOffset &&
        annotation.end_index <= urlEndOffset,
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
  } else if (node.type === 'image') {
    const imageNode = node as Image
    const nodeStart = imageNode.position?.start.offset
    const nodeEnd = imageNode.position?.end.offset
    if (!isNumber(nodeStart) || !isNumber(nodeEnd)) return [imageNode]

    const markdownSource = content.text.value.slice(nodeStart, nodeEnd)
    const relativeUrlStart = markdownSource.indexOf(imageNode.url)
    if (relativeUrlStart < 0) return [imageNode]

    const urlStartOffset = nodeStart + relativeUrlStart
    const urlEndOffset = urlStartOffset + imageNode.url.length
    const annotation = annotations.find(
      (candidate) =>
        candidate.type === 'file_path' &&
        candidate.start_index >= urlStartOffset &&
        candidate.end_index <= urlEndOffset,
    )
    if (!annotation) return [imageNode]

    imageNode.data = {
      ...(imageNode.data ?? {}),
      hProperties: {
        ...((imageNode.data as any)?.hProperties ?? {}),
        'data-file-annotation': JSON.stringify(annotation),
      },
    }
    return [imageNode]
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
      newNodes.push(
        createTextNode({ node, startOffset: lastIndex, endOffset: start }),
      )
    }
    newNodes.push(
      createAnnotationNode({
        node,
        startOffset: start,
        endOffset: end,
        annotation,
      }),
    )
    lastIndex = end
  })
  if (lastIndex < nodeEnd) {
    newNodes.push(
      createTextNode({ node, startOffset: lastIndex, endOffset: nodeEnd }),
    )
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
