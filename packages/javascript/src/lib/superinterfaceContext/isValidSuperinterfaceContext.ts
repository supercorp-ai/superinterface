export const isValidSuperinterfaceContext = ({
  superinterfaceContext,
}: {
  superinterfaceContext: Record<string, any>
}) => {
  if (superinterfaceContext.baseUrl) {
    return true
  }

  if (Object.keys(superinterfaceContext.variables).length) {
    return true
  }

  return false
}
