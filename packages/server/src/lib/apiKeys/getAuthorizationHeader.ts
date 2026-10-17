import { headers } from 'next/headers'

export const getAuthorizationHeader = async () =>
  (await headers()).get('authorization')
