import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Order, OrderToCreate } from '../../shared/models/order';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  orderComplete = false;
  lastCreatedOrder: Order | null = null;

  createOrder(orderToCreate: OrderToCreate) {
    return this.http.post<Order>(this.baseUrl + 'orders', orderToCreate).pipe(
      tap((order) => {
        console.log('Order created and received from backend:', {
          id: order.id,
          total: order.total,
          subtotal: order.subtotal,
          shippingPrice: order.shippingPrice,
          discount: order.discount,
          calculatedTotal:
            (order.subtotal || 0) -
            (order.discount || 0) +
            (order.shippingPrice || 0),
        });
        this.lastCreatedOrder = order;
        this.orderComplete = true;
      })
    );
  }

  getOrdersForUser() {
    return this.http.get<Order[]>(this.baseUrl + 'orders');
  }

  getOrderDetailed(id: number) {
    return this.http.get<Order>(this.baseUrl + 'orders/' + id);
  }
}
