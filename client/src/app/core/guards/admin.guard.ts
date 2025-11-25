import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccountService } from '../services/account.service';
import { SnackbarService } from '../services/snackbar.service';
import { firstValueFrom } from 'rxjs';

export const adminGuard: CanActivateFn = async (route, state) => {
  const accountService = inject(AccountService);
  const router = inject(Router);
  const snack = inject(SnackbarService);

  // If user info is not loaded yet, load it first
  if (!accountService.currentUser()) {
    try {
      await firstValueFrom(accountService.getUserInfo());
    } catch (error) {
      // If we can't get user info, user is not authenticated
      snack.error('Please log in to access this page');
      router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }

  // Debug logging
  const user = accountService.currentUser();
  const isAdmin = accountService.isAdmin();
  console.log('Admin Guard Check:', {
    user: user ? { email: user.email, roles: user.roles } : null,
    isAdmin: isAdmin
  });

  // Check if user is admin
  if (isAdmin) {
    return true;
  } else {
    snack.error('Access denied. Admin privileges required.');
    router.navigateByUrl('/shop');
    return false;
  }
};
