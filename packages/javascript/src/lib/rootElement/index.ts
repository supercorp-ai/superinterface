export const rootElement = () => {
  const element = document.createElement('div')
  element.classList.add('superinterface')
  document.body.appendChild(element)

  return element
}
