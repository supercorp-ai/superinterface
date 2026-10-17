import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Generates a throwaway self-signed certificate with the openssl CLI for
// local HTTPS fakes. Clients must skip verification to talk to them.
export const createSelfSignedCert = () => {
  const dir = mkdtempSync(join(tmpdir(), 'superinterface-cert-'))

  try {
    const keyPath = join(dir, 'key.pem')
    const certPath = join(dir, 'cert.pem')

    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-subj',
        '/CN=localhost',
        '-keyout',
        keyPath,
        '-out',
        certPath,
      ],
      { stdio: 'ignore' },
    )

    return { key: readFileSync(keyPath), cert: readFileSync(certPath) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
