import {
  Link as RadixLink,
} from '@radix-ui/themes'

type Args = JSX.IntrinsicElements['a']

export const Link = ({ children, href }: Args) => (
  <RadixLink
    href={href}
  >
    {children}
  </RadixLink>
)
