import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Interceptor that automatically rewrites API URLs based on the current hostname.
 * This allows the app to work on both localhost (desktop) and network IP (phone)
 * without changing any code.
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  // Determine the correct API base URL
  let apiBaseUrl: string;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiBaseUrl = 'https://localhost:5001';
  } else {
    // Use the same hostname (network IP) for API
    apiBaseUrl = `https://${hostname}:5001`;
  }

  // Rewrite the URL
  let newUrl = req.url;
  const originalUrl = newUrl;
  
  // Replace localhost:5001 with the correct hostname (for API calls and image URLs)
  if (newUrl.includes('localhost:5001')) {
    newUrl = newUrl.replace(/https?:\/\/localhost:5001/g, apiBaseUrl);
  }
  
  // Handle relative URLs starting with /api/
  if (newUrl.startsWith('/api/')) {
    newUrl = `${apiBaseUrl}${newUrl}`;
  }
  
  // Handle relative URLs starting with api/ (no leading slash)
  if (newUrl.startsWith('api/')) {
    newUrl = `${apiBaseUrl}/api/${newUrl.substring(4)}`;
  }
  
  // Handle URLs that start with environment.apiUrl (which might have localhost)
  if (newUrl.startsWith(environment.apiUrl)) {
    newUrl = newUrl.replace(environment.apiUrl, `${apiBaseUrl}/api/`);
  }
  
  // Handle absolute URLs that contain /api/ but might have localhost
  if (newUrl.includes('/api/') && newUrl.includes('localhost:5001')) {
    newUrl = newUrl.replace(/https?:\/\/localhost:5001\/api\//g, `${apiBaseUrl}/api/`);
  }

  // Always ensure API URLs are rewritten, even if they look correct
  // This handles cases where environment.apiUrl might already have the right hostname
  const needsRewrite = 
    newUrl !== originalUrl ||
    (newUrl.includes('/api/') && !newUrl.startsWith('http')) ||
    (newUrl.startsWith(environment.apiUrl) && environment.apiUrl.includes('localhost'));

  if (needsRewrite && newUrl !== originalUrl) {
    // Debug logging (only in development)
    if (!environment.production) {
      console.log(`[API Interceptor] ${originalUrl} → ${newUrl}`);
    }
    
    const clonedRequest = req.clone({
      url: newUrl
    });
    return next(clonedRequest);
  }

  // For unchanged URLs, pass through
  return next(req);
};

