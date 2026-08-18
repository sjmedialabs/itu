import fs from 'fs'
import { processSecureUpload, validateMagicBytes, cleanupQuarantineFile } from '@/lib/security/upload-security'
import * as clamClient from '@/lib/security/clamav-client'

describe('Upload Security Service', () => {
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
  const validPdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj')
  const exeHeader = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff')
  const scriptPayload = Buffer.from('<?php echo "malicious"; ?>')

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  describe('validateMagicBytes', () => {
    it('should validate valid PNG signature', () => {
      const res = validateMagicBytes(validPngHeader, 'png')
      expect(res.valid).toBe(true)
    })

    it('should validate valid JPEG signature', () => {
      const res = validateMagicBytes(validJpegHeader, 'jpg')
      expect(res.valid).toBe(true)
    })

    it('should validate valid PDF signature', () => {
      const res = validateMagicBytes(validPdfHeader, 'pdf')
      expect(res.valid).toBe(true)
    })

    it('should detect extension spoofing when EXE is disguised as PDF', () => {
      const res = validateMagicBytes(exeHeader, 'pdf')
      expect(res.valid).toBe(false)
      expect(res.detected).toBe('EXE_DOS')
    })

    it('should detect script payload in header', () => {
      const res = validateMagicBytes(scriptPayload, 'jpg')
      expect(res.valid).toBe(false)
      expect(res.detected).toBe('SCRIPT_PAYLOAD')
    })
  })

  describe('processSecureUpload', () => {
    it('should accept valid PNG image when ClamAV returns clean', async () => {
      jest.spyOn(clamClient, 'scanBufferWithClamAV').mockResolvedValueOnce({
        clean: true,
        malware: null,
        rawResponse: 'stream: OK',
      })

      const res = await processSecureUpload({
        file: validPngHeader,
        originalName: 'profile.png',
        declaredMimeType: 'image/png',
        category: 'avatar',
      })

      expect(res.ok).toBe(true)
      if (res.ok) {
        expect(res.extension).toBe('png')
        expect(res.mimeType).toBe('image/png')
        expect(fs.existsSync(res.quarantinePath)).toBe(true)
        cleanupQuarantineFile(res.quarantinePath)
        expect(fs.existsSync(res.quarantinePath)).toBe(false)
      }
    })

    it('should reject file when ClamAV detects malware (EICAR)', async () => {
      jest.spyOn(clamClient, 'scanBufferWithClamAV').mockResolvedValueOnce({
        clean: false,
        malware: 'Eicar-Signature',
        rawResponse: 'stream: Eicar-Signature FOUND',
      })

      const res = await processSecureUpload({
        file: validPngHeader,
        originalName: 'eicar_test.png',
        declaredMimeType: 'image/png',
        category: 'avatar',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toBe('The uploaded file could not be accepted for security reasons.')
      }
    })

    it('should fail-closed when ClamAV daemon is unreachable', async () => {
      jest.spyOn(clamClient, 'scanBufferWithClamAV').mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:3310'))

      const res = await processSecureUpload({
        file: validPngHeader,
        originalName: 'photo.png',
        declaredMimeType: 'image/png',
        category: 'avatar',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(503)
        expect(res.error).toContain('File security validation service is currently unavailable')
      }
    })

    it('should reject file with disallowed extension', async () => {
      const res = await processSecureUpload({
        file: Buffer.from('test data'),
        originalName: 'script.sh',
        declaredMimeType: 'text/x-shellscript',
        category: 'avatar',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toContain("File extension '.sh' is not allowed")
      }
    })

    it('should reject test-eicar.pdf uploaded as document attachment', async () => {
      const eicarPdfBuffer = Buffer.from(
        '%PDF-1.4\n' +
        '1 0 obj\n' +
        '<< /Title (X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*) >>\n' +
        'endobj\n' +
        '%%EOF'
      )

      const res = await processSecureUpload({
        file: eicarPdfBuffer,
        originalName: 'test-eicar.pdf',
        declaredMimeType: 'application/pdf',
        category: 'document',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toBe('The uploaded file could not be accepted for security reasons.')
      }
    })

    it('should reject test-eicar.png uploaded as profile avatar with security error instead of format error', async () => {
      const eicarString = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')

      const res = await processSecureUpload({
        file: eicarString,
        originalName: 'test-eicar.png',
        declaredMimeType: 'image/png',
        category: 'avatar',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toBe('The uploaded file could not be accepted for security reasons.')
      }
    })

    it('should reject spoofed executable renamed as PDF', async () => {
      jest.spyOn(clamClient, 'scanBufferWithClamAV').mockResolvedValueOnce({
        clean: true,
        malware: null,
        rawResponse: 'stream: OK',
      })

      const res = await processSecureUpload({
        file: exeHeader,
        originalName: 'document.pdf',
        declaredMimeType: 'application/pdf',
        category: 'document',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toContain('File content does not match the declared file format')
      }
    })

    it('should reject oversized file exceeding category limit', async () => {
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024) // 3MB
      largeBuffer.set(validPngHeader, 0)

      const res = await processSecureUpload({
        file: largeBuffer,
        originalName: 'large-logo.png',
        declaredMimeType: 'image/png',
        category: 'operator_logo', // max 2MB
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toContain('File size exceeds the maximum limit')
      }
    })

    it('should reject empty file buffer', async () => {
      const res = await processSecureUpload({
        file: Buffer.alloc(0),
        originalName: 'empty.png',
        category: 'avatar',
      })

      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(400)
        expect(res.error).toContain('Uploaded file is empty')
      }
    })
  })
})
