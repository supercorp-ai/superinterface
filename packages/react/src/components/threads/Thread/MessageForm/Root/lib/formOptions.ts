import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  content: z.string().min(1),
})

export const formOptions = {
  resolver: zodResolver(schema),
}
