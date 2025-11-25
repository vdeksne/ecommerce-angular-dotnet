import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AccountService } from '../../../core/services/account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatFormField,
    MatInput,
    MatLabel,
    MatError,
    MatButton
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  returnUrl = '/shop';

  constructor() {
    const url = this.activatedRoute.snapshot.queryParams['returnUrl'];
    if (url) this.returnUrl = url;
  }

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(3)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      this.snackBar.open('Please enter a valid email and password', 'Close', {
        duration: 3000
      });
      return;
    }

    this.accountService.login(this.loginForm.value).subscribe({
      next: () => {
        this.accountService.getUserInfo().subscribe({
          next: () => {
            this.snackBar.open('Login successful!', 'Close', {
              duration: 2000
            });
            this.router.navigateByUrl(this.returnUrl);
          },
          error: (err) => {
            console.error('Failed to get user info:', err);
            this.snackBar.open('Login successful but failed to load user info', 'Close', {
              duration: 3000
            });
          }
        });
      },
      error: (err) => {
        console.error('Login failed:', err);
        let errorMessage = 'Login failed. Please try again.';
        
        if (err.status === 401) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (err.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        } else if (err.error?.detail) {
          errorMessage = err.error.detail;
        }
        
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000
        });
      }
    })
  }
}
