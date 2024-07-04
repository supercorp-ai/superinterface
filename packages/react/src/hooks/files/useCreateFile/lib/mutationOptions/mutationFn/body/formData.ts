export const formData = (variables: any) => {
  const data = new FormData()

  for (const key in variables) {
    data.append(key, variables[key])
  }

  return data
}
