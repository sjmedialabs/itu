/** CMS upload helpers (presentation-adjacent service; no API side effects). */

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width)
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height)
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(typeof e.target?.result === 'string' ? e.target.result : '')
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75)
        resolve(compressedDataUrl)
      }
      img.onerror = () => {
        resolve(typeof e.target?.result === 'string' ? e.target.result : '')
      }
      img.src = typeof e.target?.result === 'string' ? e.target.result : ''
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function handleCmsUpload(
  file: File | undefined,
  onDone: (url: string) => void,
): Promise<void> {
  if (!file) return
  const dataUrl = await fileToDataUrl(file)
  if (dataUrl) onDone(dataUrl)
}
