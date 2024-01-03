import { Components } from 'react-markdown'
import { Paragraph } from './Paragraph'
import { Link } from './Link'
import { UnorderedList } from './UnorderedList'
import { OrderedList } from './OrderedList'
import { ListItem } from './ListItem'
import { Strong } from './Strong'

export const components: Components = {
  p: Paragraph,
  a: Link,
  strong: Strong,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
}
