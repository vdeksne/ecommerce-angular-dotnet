import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { OrderParams } from '../../shared/models/orderParams';
import { Pagination } from '../../shared/models/pagination';
import { Order } from '../../shared/models/order';
import { Product } from '../../shared/models/product';
import { ArchiveImage, CreateArchiveImageDto, UpdateArchiveImageDto } from '../../shared/models/archive-image';

@Injectable({
  providedIn: 'root'
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
    return this.http.get<Pagination<Order>>(this.baseUrl + 'admin/orders', {params});
  }

  getOrder(id: number) {
    return this.http.get<Order>(this.baseUrl + 'admin/orders/' + id);
  }

  refundOrder(id: number) {
    return this.http.post<Order>(this.baseUrl + 'admin/orders/refund/' + id, {});
  }

  // Product management methods
  getProducts(pageIndex: number = 1, pageSize: number = 10) {
    let params = new HttpParams();
    params = params.append('pageIndex', pageIndex);
    params = params.append('pageSize', pageSize);
    return this.http.get<Pagination<Product>>(this.baseUrl + 'products', {params});
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
    return this.http.post(this.baseUrl + 'upload/product-image', formData, {
      reportProgress: false,
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        // .NET returns JSON string (with quotes), so we need to parse it
        let imageUrl: string;
        try {
          const parsed = JSON.parse(response);
          imageUrl = typeof parsed === 'string' ? parsed : (parsed?.url || parsed);
        } catch {
          // If not JSON, it's already a string - remove quotes if present
          const trimmed = response.trim();
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
              (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
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
      withCredentials: true
    });
  }

  getArchiveImage(id: number) {
    return this.http.get<ArchiveImage>(this.baseUrl + 'archive/' + id, {
      withCredentials: true
    });
  }

  createArchiveImage(image: CreateArchiveImageDto) {
    return this.http.post<ArchiveImage>(this.baseUrl + 'archive', image, {
      withCredentials: true
    });
  }

  updateArchiveImage(id: number, image: UpdateArchiveImageDto) {
    return this.http.put<ArchiveImage>(this.baseUrl + 'archive/' + id, image, {
      withCredentials: true
    });
  }

  deleteArchiveImage(id: number) {
    return this.http.delete(this.baseUrl + 'archive/' + id, {
      withCredentials: true
    });
  }

  uploadArchiveImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(this.baseUrl + 'upload/archive-image', formData, {
      reportProgress: false,
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        // .NET returns JSON string (with quotes), so we need to parse it
        let imageUrl: string;
        try {
          const parsed = JSON.parse(response);
          imageUrl = typeof parsed === 'string' ? parsed : (parsed?.url || parsed);
        } catch {
          // If not JSON, it's already a string - remove quotes if present
          const trimmed = response.trim();
          if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
              (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
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
}
