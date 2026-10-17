// The width and top margin of each text line in the messages skeletons
// inside `container`: per skeleton, a name line and three lines of text.
export const messagesSkeletonLines = ({
  container,
}: {
  container: ParentNode
}) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      'span.rt-Skeleton[data-inline-skeleton]',
    ),
  ).map(({ style }) => ({ width: style.width, marginTop: style.marginTop }))
