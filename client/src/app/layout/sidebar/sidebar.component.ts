import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AccountService } from '../../core/services/account.service';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatIcon,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  accountService = inject(AccountService);
  private router = inject(Router);

  getDisplayName(): string {
    const user = this.accountService.currentUser();
    if (!user) return '';
    
    // Use first name + last name if available
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    // Use first name only if available
    if (user.firstName) {
      return user.firstName;
    }
    
    // Fallback to email username (part before @)
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  }

  logout() {
    this.accountService.logout().subscribe({
      next: () => {
        this.accountService.currentUser.set(null);
        this.router.navigateByUrl('/');
      },
    });
  }

  navigateTo(path: string) {
    this.router.navigateByUrl(path);
  }
}
