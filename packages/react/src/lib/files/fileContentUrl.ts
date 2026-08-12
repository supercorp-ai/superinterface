export const fileContentUrl = ({
  baseUrl,
  variables,
  fileId,
  containerId,
}: {
  baseUrl: string
  variables: ConstructorParameters<typeof URLSearchParams>[0]
  fileId: string
  containerId?: string
}) => {
  const searchParams = new URLSearchParams(variables)
  if (containerId) {
    searchParams.set('containerId', containerId)
  }
  const query = searchParams.toString()

  return `${baseUrl}/files/${encodeURIComponent(fileId)}/contents${query ? `?${query}` : ''}`
}

export const fileIdsFromAnnotation = (
  annotation: unknown,
): { fileId: string; containerId?: string } | null => {
  if (!annotation || typeof annotation !== 'object') return null

  const candidate = annotation as {
    type?: unknown
    file_path?: {
      file_id?: unknown
      container_id?: unknown
    }
  }
  if (
    candidate.type !== 'file_path' ||
    !candidate.file_path ||
    typeof candidate.file_path.file_id !== 'string'
  ) {
    return null
  }

  const containerId = candidate.file_path.container_id
  const normalizedContainerId =
    containerId === undefined
      ? undefined
      : typeof containerId === 'string'
        ? containerId
        : null
  if (normalizedContainerId === null) {
    return null
  }

  return {
    fileId: candidate.file_path.file_id,
    containerId: normalizedContainerId,
  }
}
