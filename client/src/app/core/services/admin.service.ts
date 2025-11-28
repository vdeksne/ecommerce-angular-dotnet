import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { OrderParams } from '../../shared/models/orderParams';
import { Pagination } from '../../shared/models/pagination';
import { Order } from '../../shared/models/order';
import { Product } from '../../shared/models/product';
import {
  ArchiveImage,
  CreateArchiveImageDto,
  UpdateArchiveImageDto,
} from '../../shared/models/archive-image';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getOrders(orderParams: OrderParams) {
    let params = new HttpParams();
    if (orderParams.filter && orderParams.filter !== 'All') {
      params = params.append('status', orderParams.filter);
    }
    params = params.append('pageIndex', orderParams.pageNumber);
    params = params.append('pageSize', orderParams.pageSize);
    return this.http.get<Pagination<Order>>(this.baseUrl + 'admin/orders', {
      params,
    });
  }

  getOrder(id: number) {
    return this.http.get<Order>(this.baseUrl + 'admin/orders/' + id);
  }

  refundOrder(id: number) {
    return this.http.post<Order>(
      this.baseUrl + 'admin/orders/refund/' + id,
      {}
    );
  }

  // Product management methods
  getProducts(pageIndex: number = 1, pageSize: number = 10) {
    let params = new HttpParams();
    params = params.append('pageIndex', pageIndex);
    params = params.append('pageSize', pageSize);
    return this.http.get<Pagination<Product>>(this.baseUrl + 'products', {
      params,
    });
  }

  getProduct(id: number) {
    return this.http.get<Product>(this.baseUrl + 'products/' + id);
  }

  createProduct(product: Product) {
    return this.http.post<Product>(this.baseUrl + 'products', product);
  }

  updateProduct(id: number, product: Product) {
    return this.http.put(this.baseUrl + 'products/' + id, product);
  }

  deleteProduct(id: number) {
    return this.http.delete(this.baseUrl + 'products/' + id);
  }

  getBrands() {
    return this.http.get<string[]>(this.baseUrl + 'products/brands');
  }

  getTypes() {
    return this.http.get<string[]>(this.baseUrl + 'products/types');
  }

  uploadProductImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(this.baseUrl + 'upload/product-image', formData, {
        reportProgress: false,
        withCredentials: true,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          // .NET returns JSON string (with quotes), so we need to parse it
          let imageUrl: string;
          try {
            const parsed = JSON.parse(response);
            imageUrl =
              typeof parsed === 'string' ? parsed : parsed?.url || parsed;
          } catch {
            // If not JSON, it's already a string - remove quotes if present
            const trimmed = response.trim();
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              imageUrl = trimmed.slice(1, -1);
            } else {
              imageUrl = response;
            }
          }

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            return `${apiBaseUrl}${imageUrl}`;
          }

          return imageUrl;
        })
      );
  }

  // Archive image management methods
  getArchiveImages() {
    return this.http.get<ArchiveImage[]>(this.baseUrl + 'archive', {
      withCredentials: true,
    });
  }

  getArchiveImage(id: number) {
    return this.http.get<ArchiveImage>(this.baseUrl + 'archive/' + id, {
      withCredentials: true,
    });
  }

  createArchiveImage(image: CreateArchiveImageDto) {
    return this.http.post<ArchiveImage>(this.baseUrl + 'archive', image, {
      withCredentials: true,
    });
  }

  updateArchiveImage(id: number, image: UpdateArchiveImageDto) {
    return this.http.put<ArchiveImage>(this.baseUrl + 'archive/' + id, image, {
      withCredentials: true,
    });
  }

  deleteArchiveImage(id: number) {
    return this.http.delete(this.baseUrl + 'archive/' + id, {
      withCredentials: true,
    });
  }

  uploadArchiveImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(this.baseUrl + 'upload/archive-image', formData, {
        reportProgress: false,
        withCredentials: true,
        responseType: 'text',
      })
      .pipe(
        map((response: string) => {
          // .NET returns JSON string (with quotes), so we need to parse it
          let imageUrl: string;
          try {
            const parsed = JSON.parse(response);
            imageUrl =
              typeof parsed === 'string' ? parsed : parsed?.url || parsed;
          } catch {
            // If not JSON, it's already a string - remove quotes if present
            const trimmed = response.trim();
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              imageUrl = trimmed.slice(1, -1);
            } else {
              imageUrl = response;
            }
          }

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            return `${apiBaseUrl}${imageUrl}`;
          }

          return imageUrl;
        })
      );
  }

  // Homepage image management methods
  getHomePageImage() {
    return this.http
      .get<{
        imageUrl: string;
        objectPositionX?: number;
        objectPositionY?: number;
      }>(this.baseUrl + 'admin/homepage-image')
      .pipe(
        map((response) => {
          let imageUrl: string = response?.imageUrl || '';

          // Filter out invalid localhost:3845 URLs
          if (imageUrl && imageUrl.includes('localhost:3845')) {
            imageUrl = '';
          }

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl && imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            imageUrl = `${apiBaseUrl}${imageUrl}`;
          }

          return {
            imageUrl: imageUrl || '',
            objectPositionX: response?.objectPositionX ?? 50,
            objectPositionY: response?.objectPositionY ?? 50,
          };
        })
      );
  }

  updateHomePageImage(
    imageUrl: string,
    objectPositionX?: number,
    objectPositionY?: number
  ) {
    return this.http.put(
      this.baseUrl + 'admin/homepage-image',
      {
        imageUrl,
        objectPositionX,
        objectPositionY,
      },
      {
        withCredentials: true,
      }
    );
  }

  uploadHomePageImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post(this.baseUrl + 'upload/homepage-image', formData, {
        reportProgress: false,
        withCredentials: true,
        responseType: 'text',
      } as any)
      .pipe(
        map((response: any) => {
          // Convert response to string if needed
          const responseStr =
            typeof response === 'string' ? response : String(response);
          // .NET returns JSON string (with quotes), so we need to parse it
          let imageUrl: string;
          try {
            const parsed = JSON.parse(responseStr);
            imageUrl =
              typeof parsed === 'string' ? parsed : parsed?.url || parsed;
          } catch {
            // If not JSON, it's already a string - remove quotes if present
            const trimmed = responseStr.trim();
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              imageUrl = trimmed.slice(1, -1);
            } else {
              imageUrl = responseStr;
            }
          }

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            return `${apiBaseUrl}${imageUrl}`;
          }

          return imageUrl;
        })
      );
  }

  // Context page management methods
  getContextPage() {
    return this.http
      .get<{
        sectionTitle: string;
        sectionText: string;
        imageUrl: string;
        objectPositionX?: number;
        objectPositionY?: number;
      }>(this.baseUrl + 'admin/context-page')
      .pipe(
        map((response) => {
          let imageUrl: string = response?.imageUrl || '';

          // Filter out invalid localhost:3845 URLs
          if (imageUrl && imageUrl.includes('localhost:3845')) {
            imageUrl = '';
          }

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl && imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            imageUrl = `${apiBaseUrl}${imageUrl}`;
          }

          return {
            sectionTitle: response?.sectionTitle || '',
            sectionText: response?.sectionText || '',
            imageUrl: imageUrl || '',
            objectPositionX: response?.objectPositionX ?? 50,
            objectPositionY: response?.objectPositionY ?? 50,
          };
        })
      );
  }

  updateContextPage(
    sectionTitle: string,
    sectionText: string,
    imageUrl: string,
    objectPositionX?: number,
    objectPositionY?: number
  ) {
    return this.http.put(
      this.baseUrl + 'admin/context-page',
      {
        sectionTitle,
        sectionText,
        imageUrl,
        objectPositionX,
        objectPositionY,
      },
      {
        withCredentials: true,
      }
    );
  }

  uploadContextImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    console.log(
      'Uploading context image to:',
      this.baseUrl + 'upload/context-image'
    );
    return this.http
      .post(this.baseUrl + 'upload/context-image', formData, {
        reportProgress: false,
        withCredentials: true,
        responseType: 'text',
      } as any)
      .pipe(
        map((response: any) => {
          console.log('Context image upload response:', response);
          // Convert response to string if needed
          const responseStr =
            typeof response === 'string' ? response : String(response);
          console.log('Response string:', responseStr);
          // .NET returns JSON string (with quotes), so we need to parse it
          let imageUrl: string;
          try {
            const parsed = JSON.parse(responseStr);
            imageUrl =
              typeof parsed === 'string' ? parsed : parsed?.url || parsed;
          } catch {
            // If not JSON, it's already a string - remove quotes if present
            const trimmed = responseStr.trim();
            if (
              (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
              (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ) {
              imageUrl = trimmed.slice(1, -1);
            } else {
              imageUrl = responseStr;
            }
          }

          console.log('Parsed image URL:', imageUrl);

          // Convert relative path to absolute URL pointing to API server
          if (imageUrl.startsWith('/images/')) {
            const apiBaseUrl = this.baseUrl.replace('/api/', '');
            return `${apiBaseUrl}${imageUrl}`;
          }

          return imageUrl;
        }),
        catchError((error) => {
          console.error('Context image upload error:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error,
            url: error.url,
          });
          return throwError(() => error);
        })
      );
  }
}
