import { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { parseExpression } from '@babel/parser'
import * as Babel from '@babel/types'

type MdxJsxElement = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute | any>
  children: any[]
}

type MdxJsxAttribute = {
  type: 'mdxJsxAttribute'
  name: string
  value?: string | number | boolean | null | MdxJsxAttributeValueExpression
}

type MdxJsxAttributeValueExpression = {
  type: 'mdxJsxAttributeValueExpression'
  value: string
  data?: any
}

type MdxJsxExpressionAttribute = {
  type: 'mdxJsxExpressionAttribute'
  name: string
  value: string
}

type MdxFlowExpression = { type: 'mdxFlowExpression'; value: string }
type MdxTextExpression = { type: 'mdxTextExpression'; value: string }

export const remarkPureLiteralPlugin: Plugin = () => (tree) => {
  visit(tree, (node: any) => {
    if (
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement'
    ) {
      const jsxEl = node as MdxJsxElement
      jsxEl.attributes.forEach((attr) => {
        if (attr.type === 'mdxJsxExpressionAttribute') {
          handleExpressionAttribute(attr, attr.value)
        } else if (
          // Every other attribute is an `mdxJsxAttribute`: its value is a
          // string, null for a bare attribute, or an expression.
          attr.value?.type === 'mdxJsxAttributeValueExpression'
        ) {
          handleExpressionAttribute(attr, attr.value.value)
        }
      })
    }

    if (
      node.type === 'mdxFlowExpression' ||
      node.type === 'mdxTextExpression'
    ) {
      const exprNode = node as MdxFlowExpression | MdxTextExpression
      node.type = 'text'
      node.value = `{${exprNode.value}}`
      Object.keys(node).forEach((k) => {
        if (!['type', 'value', 'position'].includes(k)) delete node[k]
      })
    }
  })
}

const handleExpressionAttribute = (
  attr: MdxJsxExpressionAttribute | MdxJsxAttribute,
  rawExpression: string,
) => {
  if (!checkIfPureLiteral(rawExpression)) {
    attr.type = 'mdxJsxAttribute'
    attr.value = `{${rawExpression}}`
  }
}

const fixRawExpression = (rawExpr: string): string => `(${rawExpr.trim()})`

// MDX only hands over expressions that parse as one JavaScript expression;
// `parseExpression` throws on anything else.
const checkIfPureLiteral = (rawExpr: string): boolean => {
  try {
    return isNodePureLiteral(
      parseExpression(fixRawExpression(rawExpr), {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
      }),
    )
  } catch {
    return false
  }
}

const isNodePureLiteral = (node: Babel.Node): boolean => {
  if (
    Babel.isNumericLiteral(node) ||
    Babel.isStringLiteral(node) ||
    Babel.isBooleanLiteral(node) ||
    Babel.isNullLiteral(node)
  ) {
    return true
  }

  if (Babel.isTemplateLiteral(node)) {
    if (node.expressions.length === 0) {
      return true
    }

    return false
  }

  if (Babel.isObjectExpression(node)) {
    return node.properties.every(
      (prop) =>
        Babel.isObjectProperty(prop) &&
        !prop.computed &&
        (Babel.isIdentifier(prop.key) ||
          Babel.isStringLiteral(prop.key) ||
          Babel.isNumericLiteral(prop.key)) &&
        isNodePureLiteral(prop.value),
    )
  }
  if (Babel.isArrayExpression(node)) {
    return node.elements.every((el) => el && isNodePureLiteral(el))
  }
  return false
}
