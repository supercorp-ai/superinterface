export const windowSuperinterfaceContext = ({
  windowSuperinterface: {
    baseUrl,
    ...variables
  },
}: {
  windowSuperinterface: Record<string, string>
}) => ({
  ...(baseUrl ? { baseUrl } : {}),
  variables,
})
