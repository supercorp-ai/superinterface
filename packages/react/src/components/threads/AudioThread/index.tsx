import { Root, Args as RootArgs } from './Root'
import { Visualization } from './Visualization'
import { Form } from './Form'

type Args = Omit<RootArgs, 'children'>

export const AudioThread = (props: Args) => (
  <Root {...props}>
    <Visualization />
    <Form />
  </Root>
)

AudioThread.Root = Root
AudioThread.Visualization = Visualization
AudioThread.Form = Form
