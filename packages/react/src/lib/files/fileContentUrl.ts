export type FileReference =
  | {
      source: 'file'
      fileId: string
    }
  | {
      source: 'container'
      fileId: string
      containerId: string
    }

export const fileContentUrl = ({
  baseUrl,
  variables,
  reference,
}: {
  baseUrl: string
  variables: ConstructorParameters<typeof URLSearchParams>[0]
  reference: FileReference
}) => {
  const searchParams = new URLSearchParams(variables)
  if (reference.source === 'container') {
    searchParams.set('containerId', reference.containerId)
  }
  const query = searchParams.toString()

  return `${baseUrl}/files/${encodeURIComponent(reference.fileId)}/contents${query ? `?${query}` : ''}`
}

export const fileReference = ({
  fileId,
  containerId,
}: {
  fileId: string
  containerId?: string
}): FileReference =>
  containerId
    ? { source: 'container', fileId, containerId }
    : { source: 'file', fileId }

export const fileReferenceFromAnnotation = (
  annotation: unknown,
): FileReference | null => {
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

  return fileReference({
    fileId: candidate.file_path.file_id,
    containerId: normalizedContainerId,
  })
}
