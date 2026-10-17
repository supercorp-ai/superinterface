export const isValidMcpServerLabel = ({ label }: { label: string }) =>
  /[a-zA-Z0-9]/.test(label)
