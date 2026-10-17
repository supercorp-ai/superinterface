const DATA_URL_SEPARATOR = ','

// The base64 payload of a `data:<type>;base64,<payload>` URL.
export const dataUrlBase64 = ({ dataUrl }: { dataUrl: string }) =>
  dataUrl.split(DATA_URL_SEPARATOR)[1]
