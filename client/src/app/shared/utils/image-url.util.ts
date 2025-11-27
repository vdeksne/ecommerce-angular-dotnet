import { environment } from '../../../environments/environment';

/**
 * Converts a relative image path to an absolute URL pointing to the API server
 * Automatically detects if running on localhost or network IP
 * @param imagePath - The image path (e.g., "/images/products/image.jpg" or "https://...")
 * @returns The absolute URL to the image
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }

  // If it's already a blob/data URL, return as-is
  if (imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Get the correct API base URL based on current hostname
  let apiBaseUrl: string;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      apiBaseUrl = 'https://localhost:5001';
    } else {
      apiBaseUrl = `https://${hostname}:5001`;
    }
  } else {
    apiBaseUrl = environment.apiUrl.replace('/api/', '');
  }

  // If it's already an absolute URL with localhost, replace with correct hostname
  if (imagePath.startsWith('https://localhost:5001') || imagePath.startsWith('http://localhost:5001')) {
    return imagePath.replace(/https?:\/\/localhost:5001/, apiBaseUrl);
  }

  // If it's already an absolute URL (http/https) with correct hostname, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it's a relative path starting with /images/, convert to absolute URL
  if (imagePath.startsWith('/images/')) {
    return `${apiBaseUrl}${imagePath}`;
  }

  // If it doesn't start with /, add it
  if (!imagePath.startsWith('/')) {
    return `${apiBaseUrl}/images/${imagePath}`;
  }

  // Fallback: return as-is
  return imagePath;
}

