import {
  Link as RadixLink,
} from '@radix-ui/themes'

type Args = JSX.IntrinsicElements['a']

export const Link = ({
  children,
  href,
  download,
  target = '_blank',
}: Args) => (
  <RadixLink
    href={href}
    target={target}
    download={download}
  >
    {children}
  </RadixLink>
)
