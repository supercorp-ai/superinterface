import { execFileSync } from 'node:child_process'
import { inject } from 'vitest'

const quote = ({ value }: { value: string }) => `'${value.replace(/'/g, "''")}'`

// Gives the assistant an avatar the way the Superinterface dashboard stores
// it, directly in the test server's database (the public API has no avatar
// endpoint). `image` and `icon` add the avatar's image or icon row.
export const setAssistantAvatar = ({
  assistantId,
  type,
  imageUrl,
  iconName,
}: {
  assistantId: string
  type: 'IMAGE' | 'ICON' | 'EMOJI'
  imageUrl?: string
  iconName?: string
}) => {
  // The test server also shares its database URL.
  const { databaseUrl } = inject('testServer') as unknown as {
    databaseUrl: string
  }
  const avatar = `INSERT INTO "Avatar" ("type", "assistantId", "updatedAt") VALUES (${quote({ value: type })}, ${quote({ value: assistantId })}, now()) RETURNING "id"`
  const rows = [
    ...(imageUrl === undefined
      ? []
      : [
          `INSERT INTO "ImageAvatar" ("url", "avatarId", "updatedAt") SELECT ${quote({ value: imageUrl })}, "id", now() FROM avatar`,
        ]),
    ...(iconName === undefined
      ? []
      : [
          `INSERT INTO "IconAvatar" ("name", "avatarId", "updatedAt") SELECT ${quote({ value: iconName })}, "id", now() FROM avatar`,
        ]),
  ]
  const sql = rows.length ? `WITH avatar AS (${avatar}) ${rows[0]}` : avatar

  execFileSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-c', sql],
    {
      env: { ...process.env, PGPASSWORD: 'postgres' },
    },
  )
}
