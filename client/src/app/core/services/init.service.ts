import { inject, Injectable } from '@angular/core';
import { CartService } from './cart.service';
import { forkJoin, of, tap, catchError } from 'rxjs';
import { AccountService } from './account.service';
import { SignalrService } from './signalr.service';

@Injectable({
  providedIn: 'root'
})
export class InitService {
  private cartService = inject(CartService);
  private accountService = inject(AccountService);
  private signalrService = inject(SignalrService);

  init() {
    const cartId = localStorage.getItem('cart_id');
    const cart$ = cartId ? this.cartService.getCart(cartId).pipe(
      catchError(() => of(null)) // Don't fail if cart can't be loaded
    ) : of(null);

    return forkJoin({
      cart: cart$,
      user: this.accountService.getUserInfo().pipe(
        catchError(() => of(null)), // Don't fail if user info can't be loaded
        tap(user => {
          if (user) {
            try {
              this.signalrService.createHubConnection();
            } catch (error) {
              console.warn('SignalR connection failed:', error);
            }
          }
        })
      )
    }).pipe(
      catchError((error) => {
        // If initialization fails, return empty object so app still loads
        console.warn('App initialization had errors, but continuing:', error);
        return of({ cart: null, user: null });
      })
    );
  }


}
