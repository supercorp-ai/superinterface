import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Generates a throwaway self-signed certificate for a local HTTPS server.
// Clients must skip verification (NODE_TLS_REJECT_UNAUTHORIZED=0).
export const createSelfSignedCertificate = () => {
  const dir = mkdtempSync(join(tmpdir(), 'superinterface-cert-'))
  const keyPath = join(dir, 'key.pem')
  const certPath = join(dir, 'cert.pem')

  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-subj',
        '/CN=127.0.0.1',
      ],
      { stdio: 'ignore' },
    )

    return {
      key: readFileSync(keyPath, 'utf8'),
      cert: readFileSync(certPath, 'utf8'),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
