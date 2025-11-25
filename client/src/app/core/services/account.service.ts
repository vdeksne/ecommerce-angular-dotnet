import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Address, User } from '../../shared/models/user';
import { map, tap } from 'rxjs';
import { SignalrService } from './signalr.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private signalrService = inject(SignalrService);
  currentUser = signal<User | null>(null);
  isAdmin = computed(() => {
    const user = this.currentUser();
    if (!user) {
      console.log('isAdmin check: No user');
      return false;
    }
    
    const roles = user.roles;
    let result = false;
    
    if (Array.isArray(roles)) {
      result = roles.includes('Admin') || roles.some(r => r?.toLowerCase() === 'admin');
    } else if (typeof roles === 'string') {
      result = roles === 'Admin' || roles.toLowerCase() === 'admin';
    }
    
    console.log('isAdmin check:', { 
      roles, 
      result, 
      userEmail: user.email,
      rolesType: typeof roles,
      isArray: Array.isArray(roles)
    });
    return result;
  });

  login(values: any) {
    let params = new HttpParams();
    params = params.append('useCookies', 'true');
    
    // Identity API expects email and password
    const loginData = {
      email: values.email || values.username || '',
      password: values.password || '',
      twoFactorCode: values.twoFactorCode || '',
      twoFactorRecoveryCode: values.twoFactorRecoveryCode || ''
    };
    
    return this.http.post<User>(this.baseUrl + 'login', loginData, {
      params,
      withCredentials: true // Important for cookies
    }).pipe(
      tap(() => this.signalrService.createHubConnection())
    )
  }

  register(values: any) {
    return this.http.post(this.baseUrl + 'account/register', values);
  }

  getUserInfo() {
    return this.http.get<User>(this.baseUrl + 'account/user-info', {
      withCredentials: true
    }).pipe(
      map(user => {
        console.log('User info loaded:', user);
        this.currentUser.set(user);
        return user;
      })
    )
  }

  logout() {
    return this.http.post(this.baseUrl + 'account/logout', {}).pipe(
      tap(() => this.signalrService.stopHubConnection())
    )
  }

  updateAddress(address: Address) {
    return this.http.post(this.baseUrl + 'account/address', address).pipe(
      tap(() => {
        this.currentUser.update(user => {
          if (user) user.address = address;
          return user;
        })
      })
    )
  }

  getAuthState() {
    return this.http.get<{isAuthenticated: boolean}>(this.baseUrl + 'account/auth-status');
  }
}
