export const normalizeMcpServerName = (name: string) =>
  name.replace(/[^a-zA-Z0-9-]/g, '-')
