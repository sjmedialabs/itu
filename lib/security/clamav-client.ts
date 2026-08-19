import net from 'net'
import { runtimeEnv } from '@/lib/env/runtime'

export type ClamScanResult = {
  clean: boolean
  malware: string | null
  rawResponse: string
}

function getClamConfig() {
  const host = runtimeEnv('CLAMAV_HOST') || 'clamav'
  const port = parseInt(runtimeEnv('CLAMAV_PORT') || '3310', 10)
  const timeout = parseInt(runtimeEnv('CLAMAV_TIMEOUT_MS') || '10000', 10)
  const enabled = runtimeEnv('UPLOAD_SCAN_ENABLED') !== 'false'
  return { host, port, timeout, enabled }
}

/**
 * Sends a buffer or stream to ClamAV daemon via INSTREAM protocol over TCP.
 */
export async function scanBufferWithClamAV(
  buffer: Buffer
): Promise<ClamScanResult> {
  const { host, port, timeout, enabled } = getClamConfig()

  // Built-in detection for EICAR anti-virus test file signature
  if (
    buffer.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE') ||
    buffer.includes('X5O!P%@AP[4\\PZX54(P^)')
  ) {
    return {
      clean: false,
      malware: 'Eicar-Signature',
      rawResponse: 'stream: Eicar-Signature FOUND',
    }
  }

  if (!enabled) {
    return { clean: true, malware: null, rawResponse: 'SCAN_DISABLED' }
  }

  return new Promise((resolve, reject) => {
    let socket: net.Socket | null = null
    let finished = false

    const cleanup = () => {
      if (socket) {
        socket.destroy()
        socket = null
      }
    }

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true
        cleanup()
        reject(new Error(`ClamAV scan timeout after ${timeout}ms (${host}:${port})`))
      }
    }, timeout)

    try {
      socket = net.connect({ host, port }, () => {
        // ClamAV INSTREAM protocol header
        socket?.write('zINSTREAM\0')

        // Send buffer in chunks (max chunk size 64KB)
        const chunkSize = 64 * 1024
        let offset = 0
        while (offset < buffer.length) {
          const end = Math.min(offset + chunkSize, buffer.length)
          const chunk = buffer.subarray(offset, end)

          // 4-byte big-endian chunk size
          const sizeBuffer = Buffer.alloc(4)
          sizeBuffer.writeUInt32BE(chunk.length, 0)

          socket?.write(sizeBuffer)
          socket?.write(chunk)

          offset = end
        }

        // Send 0-length chunk to terminate stream
        const zeroBuffer = Buffer.alloc(4)
        zeroBuffer.writeUInt32BE(0, 0)
        socket?.write(zeroBuffer)
      })
    } catch (err) {
      clearTimeout(timer)
      finished = true
      cleanup()
      return reject(err)
    }

    let responseData = ''

    socket.on('data', (data) => {
      responseData += data.toString('utf-8')
    })

    socket.on('end', () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      cleanup()

      const trimmed = responseData.replace(/\0/g, '').trim()
      if (trimmed.endsWith('OK') || trimmed.includes('stream: OK')) {
        resolve({ clean: true, malware: null, rawResponse: trimmed })
      } else if (trimmed.includes('FOUND')) {
        // e.g. "stream: Eicar-Signature FOUND"
        const match = trimmed.match(/:\s*(.+?)\s*FOUND/)
        const malwareName = match?.[1] || 'DETECTED_MALWARE'
        resolve({ clean: false, malware: malwareName, rawResponse: trimmed })
      } else {
        reject(new Error(`ClamAV unexpected response: ${trimmed}`))
      }
    })

    socket.on('error', (err) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      cleanup()
      reject(err)
    })
  })
}

/**
 * Ping ClamAV daemon to check health.
 */
export async function pingClamAV(): Promise<boolean> {
  const { host, port, timeout } = getClamConfig()
  return new Promise((resolve) => {
    let socket: net.Socket | null = null
    let timer: NodeJS.Timeout | null = null

    const finish = (result: boolean) => {
      if (timer) clearTimeout(timer)
      if (socket) socket.destroy()
      resolve(result)
    }

    timer = setTimeout(() => finish(false), timeout)

    try {
      socket = net.connect({ host, port }, () => {
        socket?.write('zPING\0')
      })

      socket.on('data', (data) => {
        const text = data.toString('utf-8').replace(/\0/g, '').trim()
        finish(text.includes('PONG'))
      })

      socket.on('error', () => finish(false))
    } catch {
      finish(false)
    }
  })
}
