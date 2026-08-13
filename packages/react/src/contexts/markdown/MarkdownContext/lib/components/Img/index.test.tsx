import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { Img } from '.'

vi.mock('@/hooks/core/useSuperinterfaceContext', () => ({
  useSuperinterfaceContext: () => ({
    baseUrl: '/api',
    variables: {
      assistantId: 'asst_1',
      publicApiKey: 'public_1',
    },
  }),
}))

vi.mock('@/components/images/Image', () => ({
  Image: (props: JSX.IntrinsicElements['img']) => (
    <img
      data-testid="image"
      {...props}
    />
  ),
}))

describe('Markdown Img', () => {
  test('rewrites an annotated container image to the authenticated file proxy', () => {
    const annotation = JSON.stringify({
      type: 'file_path',
      file_path: {
        file_id: 'cfile_chart',
        container_id: 'cntr_chart',
      },
    })

    render(
      <Img
        alt="Quarterly chart"
        src="sandbox:/mnt/data/chart.png"
        data-file-annotation={annotation}
      />,
    )

    const image = screen.getByTestId('image')
    expect(image.getAttribute('src')).toBe(
      '/api/files/cfile_chart/contents?assistantId=asst_1&publicApiKey=public_1&containerId=cntr_chart',
    )
    expect(image.hasAttribute('data-file-annotation')).toBe(false)
  })

  test('rewrites an annotated non-container image without a container id', () => {
    const annotation = JSON.stringify({
      type: 'file_path',
      file_path: { file_id: 'file_chart' },
    })

    render(
      <Img
        alt="Chart"
        src="sandbox:/mnt/data/chart.png"
        data-file-annotation={annotation}
      />,
    )

    expect(screen.getByTestId('image').getAttribute('src')).toBe(
      '/api/files/file_chart/contents?assistantId=asst_1&publicApiKey=public_1',
    )
  })

  test('keeps the original source when annotation JSON is malformed', () => {
    render(
      <Img
        alt="Fallback"
        src="https://example.com/chart.png"
        data-file-annotation="not-json"
      />,
    )

    expect(screen.getByTestId('image').getAttribute('src')).toBe(
      'https://example.com/chart.png',
    )
  })

  test('keeps regular unannotated images unchanged', () => {
    render(
      <Img
        alt="Public"
        src="https://example.com/public.png"
      />,
    )

    expect(screen.getByTestId('image').getAttribute('src')).toBe(
      'https://example.com/public.png',
    )
  })
})
