import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { scanBufferWithClamAV } from '@/lib/security/clamav-client'
import { runtimeEnv } from '@/lib/env/runtime'

export type SecureUploadCategory = 'image' | 'avatar' | 'document' | 'ad_media' | 'operator_logo' | 'reconciliation'

export type SecureUploadOptions = {
  file: File | Blob | Buffer
  originalName?: string
  declaredMimeType?: string
  category: SecureUploadCategory
  maxSizeBytes?: number
  allowedExtensions?: string[]
  allowedMimeTypes?: string[]
}

export type SecureUploadResult =
  | {
      ok: true
      buffer: Buffer
      quarantinePath: string
      sanitizedFileName: string
      mimeType: string
      extension: string
      sizeBytes: number
    }
  | {
      ok: false
      error: string
      status: number
      details?: Record<string, unknown>
    }

const DEFAULT_QUARANTINE_DIR = path.join(process.cwd(), 'storage', 'quarantine')

function ensureQuarantineDir(): string {
  const candidates = [
    runtimeEnv('UPLOAD_QUARANTINE_DIR'),
    DEFAULT_QUARANTINE_DIR,
    path.join(os.tmpdir(), 'itu-quarantine'),
  ].filter((dir): dir is string => Boolean(dir))

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.accessSync(dir, fs.constants.W_OK)
      return dir
    } catch (err) {
      console.warn(`[UploadSecurity] Quarantine dir not writable (${dir}):`, err)
    }
  }

  return os.tmpdir()
}

/** Default Category Configurations */
const CATEGORY_RULES: Record<
  SecureUploadCategory,
  {
    maxSizeBytes: number
    allowedExts: string[]
    allowedMimes: string[]
  }
> = {
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedExts: ['png', 'jpg', 'jpeg', 'webp'],
    allowedMimes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  },
  operator_logo: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedExts: ['png'],
    allowedMimes: ['image/png'],
  },
  image: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedExts: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    allowedMimes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  },
  document: {
    maxSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedExts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'docx', 'xlsx'],
    allowedMimes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  ad_media: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedExts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'],
    allowedMimes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
    ],
  },
  reconciliation: {
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedExts: ['csv', 'xlsx', 'xls', 'json', 'txt'],
    allowedMimes: [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  },
}

/**
 * Validates file signature (magic bytes) to prevent extension/MIME spoofing.
 */

export function validateMagicBytes(buffer: Buffer, extension: string): { valid: boolean; detected: string } {
  if (buffer.length < 4) {
    return { valid: false, detected: 'too_small' }
  }

  const hex = buffer.subarray(0, 16).toString('hex').toUpperCase()

  // Executable / Script Blacklist signatures
  if (hex.startsWith('4D5A')) return { valid: false, detected: 'EXE_DOS' } // MZ
  if (hex.startsWith('7F454C46')) return { valid: false, detected: 'ELF_BINARY' } // ELF
  if (hex.startsWith('2321')) return { valid: false, detected: 'SHEBANG_SCRIPT' } // #!

  // Check shebang/PHP script in first 256 bytes
  const headStr = buffer.subarray(0, 256).toString('utf-8').toLowerCase()
  if (headStr.includes('<?php') || headStr.includes('<script') || headStr.includes('eval(')) {
    return { valid: false, detected: 'SCRIPT_PAYLOAD' }
  }

  // Allowed Signatures
  switch (extension) {
    case 'png':
      return { valid: hex.startsWith('89504E470D0A1A0A'), detected: 'png' }
    case 'jpg':
    case 'jpeg':
      return { valid: hex.startsWith('FFD8FF'), detected: 'jpeg' }
    case 'gif':
      return { valid: hex.startsWith('47494638'), detected: 'gif' }
    case 'webp':
      return { valid: hex.startsWith('52494646') && buffer.subarray(8, 12).toString('utf-8') === 'WEBP', detected: 'webp' }
    case 'pdf':
      return { valid: hex.startsWith('25504446'), detected: 'pdf' } // %PDF
    case 'docx':
    case 'xlsx':
      return { valid: hex.startsWith('504B0304'), detected: 'openxml' } // PK..
    case 'mp4':
      return { valid: hex.substring(8, 16) === '66747970', detected: 'mp4' } // ftyp
    case 'webm':
      return { valid: hex.startsWith('1A45DFA3'), detected: 'webm' }
    case 'csv':
    case 'json':
    case 'txt':
    case 'xls':
      // Text / Legacy tabular formats without rigid header signatures
      return { valid: true, detected: extension }
    default:
      return { valid: false, detected: 'unknown' }
  }
}

/**
 * Main Centralized Security Pipeline for Uploads.
 */
export async function processSecureUpload(
  options: SecureUploadOptions
): Promise<SecureUploadResult> {
  const { category, file } = options

  // 1. Convert input file to Buffer
  let buffer: Buffer
  let rawName = options.originalName || ''
  let declaredType = options.declaredMimeType || ''

  if (Buffer.isBuffer(file)) {
    buffer = file
  } else if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
    if ('name' in file && typeof file.name === 'string') rawName = file.name
    if ('type' in file && typeof file.type === 'string') declaredType = file.type
  } else {
    return { ok: false, error: 'Invalid file payload.', status: 400 }
  }

  const rules = CATEGORY_RULES[category]
  const maxSizeBytes = options.maxSizeBytes || rules.maxSizeBytes
  const allowedExts = options.allowedExtensions || rules.allowedExts
  const allowedMimes = options.allowedMimeTypes || rules.allowedMimes

  // 2. Validate Size
  if (buffer.length === 0) {
    return { ok: false, error: 'Uploaded file is empty.', status: 400 }
  }

  if (buffer.length > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1)
    return {
      ok: false,
      error: `File size exceeds the maximum limit of ${maxMb}MB.`,
      status: 400,
    }
  }

  // 3. Extract and sanitize extension & MIME
  const cleanOriginalName = path.basename(rawName).replace(/[^a-zA-Z0-9.\-_]/g, '')
  const rawExt = cleanOriginalName.split('.').pop()?.toLowerCase() || ''
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt
  const normalizedMime = (declaredType || '').toLowerCase().trim()

  if (!ext || !allowedExts.includes(ext)) {
    return {
      ok: false,
      error: `File extension '.${rawExt}' is not allowed.`,
      status: 400,
    }
  }

  if (normalizedMime && !allowedMimes.includes(normalizedMime)) {
    return {
      ok: false,
      error: `File type '${declaredType}' is not allowed.`,
      status: 400,
    }
  }

  // 4. Malware Scan via ClamAV (and built-in EICAR detection)
  try {
    const scanResult = await scanBufferWithClamAV(buffer)

    if (!scanResult.clean) {
      console.error(
        `[SECURITY INCIDENT] Malware detected in upload! OriginalName="${cleanOriginalName}", Malware="${scanResult.malware}"`
      )
      return {
        ok: false,
        error: 'The uploaded file could not be accepted for security reasons.',
        status: 400,
        details: { incident: 'malware_detected' },
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[UploadSecurity] ClamAV scanner error: ${msg}`)

    // FAIL-CLOSED policy: reject upload if scanner is down
    const scanEnabled = runtimeEnv('UPLOAD_SCAN_ENABLED') !== 'false'
    if (scanEnabled) {
      return {
        ok: false,
        error: 'File security validation service is currently unavailable. Upload rejected.',
        status: 503,
      }
    }
  }

  // 5. Magic-Byte File Signature Verification
  const magicCheck = validateMagicBytes(buffer, ext)
  if (!magicCheck.valid) {
    console.warn(`[UploadSecurity] Signature spoofing detected: ext=${ext}, detected=${magicCheck.detected}`)
    return {
      ok: false,
      error: 'File content does not match the declared file format.',
      status: 400,
    }
  }

  // 6. Save to Quarantine Storage
  const quarantineDir = ensureQuarantineDir()
  const quarantineFileName = `${crypto.randomUUID()}.tmp`
  const quarantinePath = path.join(quarantineDir, quarantineFileName)

  try {
    fs.writeFileSync(quarantinePath, buffer)
  } catch (err) {
    console.error('[UploadSecurity] Failed to write quarantine file:', err)
    return { ok: false, error: 'Internal storage error during upload processing.', status: 500 }
  }

  // 7. Generate Secure Final Storage Filename
  const secureRandomName = `${crypto.randomUUID()}.${ext}`

  return {
    ok: true,
    buffer,
    quarantinePath,
    sanitizedFileName: secureRandomName,
    mimeType: normalizedMime || `application/${ext}`,
    extension: ext,
    sizeBytes: buffer.length,
  }
}

/**
 * Removes temporary file from quarantine directory.
 */
export function cleanupQuarantineFile(quarantinePath?: string) {
  if (!quarantinePath) return
  try {
    if (fs.existsSync(quarantinePath)) {
      fs.unlinkSync(quarantinePath)
    }
  } catch (e) {
    console.warn(`[UploadSecurity] Quarantine cleanup error for ${quarantinePath}:`, e)
  }
}
