import { visit, CONTINUE, SKIP } from 'estree-util-visit';
import type {
  Node,
  VariableDeclaration,
  FunctionDeclaration,
  BlockStatement,
  IfStatement,
  CallExpression,
  AssignmentExpression,
} from 'estree';

export const recmaFallbackComponentPlugin = () => {
  return (tree: Node) => {
    // Step 1: Change variable declarations from 'const' to 'let'
    visit(tree, (node) => {
      if (node.type === 'VariableDeclaration' && node.kind === 'const') {
        const varDecl = node as VariableDeclaration;

        for (const declarator of varDecl.declarations) {
          // Check for both _components and direct component destructuring patterns
          if (
            (declarator.id.type === 'ObjectPattern' &&
              declarator.init?.type === 'Identifier' &&
              declarator.init.name === '_components') ||
            (declarator.id.type === 'ObjectPattern' &&
              declarator.init?.type === 'ObjectExpression')
          ) {
            varDecl.kind = 'let';
            return SKIP;
          }
        }
      }
      return CONTINUE;
    });

    // Step 2: Modify the _missingMdxReference function
    visit(tree, (node) => {
      if (
        node.type === 'FunctionDeclaration' &&
        node.id?.type === 'Identifier' &&
        node.id.name === '_missingMdxReference'
      ) {
        const funcNode = node as FunctionDeclaration;

        funcNode.body = {
          type: 'BlockStatement',
          body: [
            {
              type: 'IfStatement',
              test: { type: 'Identifier', name: 'component' },
              consequent: {
                type: 'ReturnStatement',
                argument: {
                  type: 'FunctionExpression',
                  id: null,
                  params: [{ type: 'Identifier', name: 'props' }],
                  body: {
                    type: 'BlockStatement',
                    body: [
                      {
                        type: 'ReturnStatement',
                        argument: {
                          type: 'BinaryExpression',
                          operator: '+',
                          left: {
                            type: 'BinaryExpression',
                            operator: '+',
                            left: { type: 'Literal', value: '<' },
                            right: { type: 'Identifier', name: 'id' }
                          },
                          right: {
                            type: 'BinaryExpression',
                            operator: '+',
                            left: { type: 'Literal', value: '></'},
                            right: {
                              type: 'BinaryExpression',
                              operator: '+',
                              left: { type: 'Identifier', name: 'id' },
                              right: { type: 'Literal', value: '>' }
                            }
                          }
                        }
                      }
                    ]
                  },
                  generator: false,
                  async: false
                }
              },
              alternate: null
            }
          ]
        } as BlockStatement;

        return SKIP;
      }
      return CONTINUE;
    });

    // Step 3: Modify the if statements to assign the missing component
    visit(tree, (node) => {
      if (node.type === 'IfStatement') {
        const ifNode = node as IfStatement;

        if (
          ifNode.test.type === 'UnaryExpression' &&
          ifNode.test.operator === '!' &&
          ifNode.test.argument.type === 'Identifier'
        ) {
          const componentName = ifNode.test.argument.name;

          if (
            ifNode.consequent.type === 'ExpressionStatement' &&
            ifNode.consequent.expression.type === 'CallExpression' &&
            ifNode.consequent.expression.callee.type === 'Identifier' &&
            ifNode.consequent.expression.callee.name === '_missingMdxReference'
          ) {
            // Create the assignment expression
            const assignmentExpr: AssignmentExpression = {
              type: 'AssignmentExpression',
              operator: '=',
              left: { type: 'Identifier', name: componentName },
              right: ifNode.consequent.expression as CallExpression,
            };

            ifNode.consequent = {
              type: 'ExpressionStatement',
              expression: assignmentExpr,
            };

            return SKIP;
          }
        }
      }
      return CONTINUE;
    });
  };
};
