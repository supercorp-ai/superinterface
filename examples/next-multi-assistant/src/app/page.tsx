import { redirect } from 'next/navigation'
import { assistants } from '@/lib/assistants'

export default function Page() {
  redirect(`/assistants/${assistants[0].id}`)
}
