import { Heading, Table } from '@radix-ui/themes'
import { Paragraph } from './Paragraph'
import { Link } from './Link'
import { UnorderedList } from './UnorderedList'
import { OrderedList } from './OrderedList'
import { ListItem } from './ListItem'
import { Strong } from './Strong'
import { Pre } from './Pre'
import { Code } from './Code'
import { Img } from './Img'
import { Annotation } from './Annotation'

export const components = {
  p: Paragraph,
  a: Link,
  strong: Strong,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  pre: Pre,
  code: Code,
  img: Img,
  annotation: Annotation,
  h1: (props:  JSX.IntrinsicElements['h1']) => <Heading as="h1">{props.children}</Heading>,
  h2: (props:  JSX.IntrinsicElements['h2']) => <Heading as="h2" size="5">{props.children}</Heading>,
  h3: (props:  JSX.IntrinsicElements['h3']) => <Heading as="h3" size="4">{props.children}</Heading>,
  h4: (props:  JSX.IntrinsicElements['h4']) => <Heading as="h4" size="3">{props.children}</Heading>,
  h5: (props:  JSX.IntrinsicElements['h5']) => <Heading as="h5" size="3">{props.children}</Heading>,
  h6: (props:  JSX.IntrinsicElements['h6']) => <Heading as="h6" size="3">{props.children}</Heading>,
  table: (props: JSX.IntrinsicElements['table']) => (
    <>
      <style>{`.rt-TableRootTable { overflow: inherit; }`}</style>
      <Table.Root
        {...props}
        variant="surface"
        mb="3"
      />
    </>
  ),
  thead: (props: JSX.IntrinsicElements['thead']) => (
    <Table.Header
      {...props}
    />
  ),
  tbody: (props: JSX.IntrinsicElements['tbody']) => (
    <Table.Body
      {...props}
    />
  ),
  tr: (props: JSX.IntrinsicElements['tr']) => (
    <Table.Row
      {...props}
    />
  ),
  td: ({ width, ...rest }: JSX.IntrinsicElements['td']) => (
    <Table.Cell
      {...rest}
      width={width as string}
    />
  ),
  th: (props: JSX.IntrinsicElements['th']) => (
    <Table.ColumnHeaderCell
      {...props}
    />
  ),
}
