import { getSession } from './auth.js'
const API_URL = import.meta.env.VITE_API_URL;
/**
 * Uploads a single image file to the backend.
 * @param {File} file - The image file to upload.
 * @returns {Promise<string>} The URL of the uploaded image.
 * @throws {Error} If the response is not ok.
 */
export async function uploadImage(file) {
  const session = getSession()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_URL}/api/v1/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  const { url } = await res.json()
  return url
}

/**
 * Uploads multiple image files to the backend as a gallery.
 * @param {File[]} files - Array of image files to upload.
 * @returns {Promise<string[]>} Array of URLs for the uploaded images.
 * @throws {Error} If the response is not ok.
 */
export async function uploadGallery(files) {
  const session = getSession()
  const formData = new FormData()

  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch(`${API_URL}/api/v1/upload/gallery`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  const { urls } = await res.json()
  return urls
}
