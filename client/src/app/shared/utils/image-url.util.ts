import { environment } from '../../../environments/environment';

/**
 * Converts a relative image path to an absolute URL pointing to the API server
 * @param imagePath - The image path (e.g., "/images/products/image.jpg" or "https://...")
 * @returns The absolute URL to the image
 */
export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) {
    return '';
  }

  // If it's already an absolute URL (http/https) or a blob/data URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || 
      imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // If it's a relative path starting with /images/, convert to absolute URL
  if (imagePath.startsWith('/images/')) {
    const apiBaseUrl = environment.apiUrl.replace('/api/', '');
    return `${apiBaseUrl}${imagePath}`;
  }

  // If it doesn't start with /, add it
  if (!imagePath.startsWith('/')) {
    const apiBaseUrl = environment.apiUrl.replace('/api/', '');
    return `${apiBaseUrl}/images/${imagePath}`;
  }

  // Fallback: return as-is
  return imagePath;
}

