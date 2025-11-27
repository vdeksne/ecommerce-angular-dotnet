import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  /**
   * Gets the API base URL based on the current hostname.
   * Automatically detects if running on localhost or network IP.
   */
  getApiBaseUrl(): string {
    if (typeof window === 'undefined') {
      // Server-side rendering fallback
      return 'https://localhost:5001';
    }

    const hostname = window.location.hostname;

    // If accessing from localhost, use localhost for API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'https://localhost:5001';
    }

    // If accessing from network IP, use the same IP for API
    return `https://${hostname}:5001`;
  }

  /**
   * Gets the full API URL (with /api/ suffix)
   */
  getApiUrl(): string {
    return `${this.getApiBaseUrl()}/api/`;
  }

  /**
   * Gets the SignalR hub URL
   */
  getHubUrl(): string {
    return `${this.getApiBaseUrl()}/hub/notifications`;
  }
}





