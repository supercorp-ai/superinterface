export const corsHeadersOf = ({ headers }: { headers: Headers }) => ({
  'access-control-allow-origin': headers.get('access-control-allow-origin'),
  'access-control-allow-methods': headers.get('access-control-allow-methods'),
  'access-control-allow-headers': headers.get('access-control-allow-headers'),
})
