// File: remarkPureLiteralPlugin.ts

import { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { parse } from '@babel/parser'
import * as Babel from '@babel/types'

/**
 * We assume MDX v2 style MDAST. The relevant node types often are:
 * - mdxJsxFlowElement, mdxJsxTextElement (JSX elements, block or inline)
 * - mdxJsxAttribute, mdxJsxAttributeValueExpression (for attributes like prop={expr})
 * - mdxFlowExpression, mdxTextExpression (for {expr} in text)
 *
 * In older MDX versions, you might see 'mdxJsxExpressionAttribute' instead of
 * 'mdxJsxAttribute' + 'mdxJsxAttributeValueExpression'. We'll handle that too.
 */

/** Minimal shape for an MDX element node. */
interface MdxJsxElement {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name: string | null
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute | any>
  children: any[]
}

/** Typically for v2: <Component prop="someValue" /> or prop={expr} */
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute'
  name: string
  value?: string | number | boolean | null | MdxJsxAttributeValueExpression
}

/** Typically for v2: holds the actual JS expression from prop={expr} */
interface MdxJsxAttributeValueExpression {
  type: 'mdxJsxAttributeValueExpression'
  value: string // the raw JS inside { ... }
  data?: any    // might contain 'estree'
}

/** Older MDX (v1) style: <Component prop={expr}> => mdxJsxExpressionAttribute */
interface MdxJsxExpressionAttribute {
  type: 'mdxJsxExpressionAttribute'
  name: string
  value: string // raw expression
}

/** { expr } in block or inline text */
interface MdxFlowExpression {
  type: 'mdxFlowExpression'
  value: string
}
interface MdxTextExpression {
  type: 'mdxTextExpression'
  value: string
}

/**
 * This remark plugin enforces:
 * 1) Only pure-literal expressions in JSX props (<Comp prop={5} /> is fine, prop={identifier} => fallback).
 * 2) Braces in normal text are forced literal ("yo {["1","2"]}" stays that way).
 */
export const remarkPureLiteralPlugin: Plugin = function remarkPureLiteralPlugin() {
  return (tree) => {
    visit(tree, (node: any, index: number | null | undefined, parent: any) => {
      // 1) For <Component ...> (block or inline)
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        const jsxEl = node as MdxJsxElement
        jsxEl.attributes.forEach((attr, i) => {
          // A) MDX v1 style:
          if (attr.type === 'mdxJsxExpressionAttribute') {
            const rawExpression = attr.value
            handleExpressionAttribute(attr, rawExpression)
          }
          // B) MDX v2 style: 'mdxJsxAttribute' with possible 'mdxJsxAttributeValueExpression'
          else if (attr.type === 'mdxJsxAttribute') {
            // Could be prop="someLiteral" or prop={someExpression}
            // If it's an expression, .value is an object
            if (
              typeof attr.value === 'object' &&
              attr.value !== null &&
              attr.value.type === 'mdxJsxAttributeValueExpression'
            ) {
              const rawExpression = attr.value.value
              handleExpressionAttribute(attr, rawExpression)
            }
          }
        })
      }

      // 2) For {expression} in normal text
      //    We'll force them to become literal text with braces if they're not in a prop.
      if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
        // We want to confirm it's not inside an attribute, which typically won't happen anyway.
        // So we just convert it to a "text" node: e.g. { [1,2] } => " text: '{[1,2]}' "
        const exprNode = node as MdxFlowExpression | MdxTextExpression

        // Convert to normal mdast text node
        node.type = 'text'
        node.value = `{${exprNode.value}}`

        // remove leftover fields
        for (const k of Object.keys(node)) {
          if (!['type', 'value', 'position'].includes(k)) {
            delete node[k]
          }
        }
      }
    })
  }
}

/**
 * Helper to handle an attribute that definitely has a JS expression (like prop={...}).
 * We'll check if it's pure-literal; if not, fallback to a plain string with braces.
 */
function handleExpressionAttribute(
  attr: MdxJsxExpressionAttribute | MdxJsxAttribute,
  rawExpression: string
) {
  const isPure = checkIfPureLiteral(rawExpression)
  if (!isPure) {
    // fallback => e.g. hello="{someVariable}"
    attr.type = 'mdxJsxAttribute'
    attr.value = `{${rawExpression}}`
  } else {
    // If pure-literal, we do nothing -> keep real expression
  }
}

function fixRawExpression(rawExpr: string): string {
  const trimmed = rawExpr.trim()
  // If it doesn't already start with '(' or '[' or something, just add them:
  return `(${trimmed})`
}

/**
 * checkIfPureLiteral: parse the expression with Babel & confirm it only
 * has numeric/string/boolean/null or object/array with same.
 */
function checkIfPureLiteral(rawExpr: string): boolean {
  let ast: Babel.File
  try {
		const fixed = fixRawExpression(rawExpr)
    ast = parse(fixed, {
      sourceType: 'unambiguous',
      plugins: [
        'jsx',
        'typescript', // if you allow TS in your expressions
      ],
    })
  } catch(e)  {
    return false
  }

  if (ast.program.body.length !== 1) return false
  const stmt = ast.program.body[0]
  if (!Babel.isExpressionStatement(stmt)) return false
  return isNodePureLiteral(stmt.expression)
}

function isNodePureLiteral(node: Babel.Node | null | undefined): boolean {
  if (!node) return false

  if (
    Babel.isNumericLiteral(node) ||
    Babel.isStringLiteral(node) ||
    Babel.isBooleanLiteral(node) ||
    Babel.isNullLiteral(node)
  ) {
    return true
  }

  if (Babel.isObjectExpression(node)) {
    return node.properties.every((prop) => {
      if (!Babel.isObjectProperty(prop) || prop.computed) return false
      // key must be an identifier or literal
      if (
        !Babel.isIdentifier(prop.key) &&
        !Babel.isStringLiteral(prop.key) &&
        !Babel.isNumericLiteral(prop.key)
      ) {
        return false
      }
      return isNodePureLiteral(prop.value)
    })
  }

  if (Babel.isArrayExpression(node)) {
    return node.elements.every((el) => el && isNodePureLiteral(el))
  }

  // If you want to allow unary minus: -5
  // if (Babel.isUnaryExpression(node)) {
  //   if ((node.operator === '+' || node.operator === '-') && Babel.isNumericLiteral(node.argument)) {
  //     return true
  //   }
  //   return false
  // }

  return false
}
