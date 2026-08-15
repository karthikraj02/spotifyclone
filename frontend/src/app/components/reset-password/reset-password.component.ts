import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span>Spotify</span>
        </div>
        <h1>Create New Password</h1>
        <p class="subtitle">Please enter your new password below.</p>

        @if (errorMessage) {
          <div class="alert alert-error">{{ errorMessage }}</div>
        }
        @if (successMessage) {
          <div class="alert alert-success">{{ successMessage }}</div>
        }

        <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" *ngIf="!successMessage">
          <div class="form-group">
            <label for="password">New Password</label>
            <input id="password" type="password" formControlName="password" placeholder="New password"
              [class.error]="resetForm.get('password')?.invalid && resetForm.get('password')?.touched" />
            @if (resetForm.get('password')?.invalid && resetForm.get('password')?.touched) {
              <span class="error-msg">Password must be at least 6 characters</span>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" type="password" formControlName="confirmPassword" placeholder="Confirm new password"
              [class.error]="resetForm.get('confirmPassword')?.touched && resetForm.hasError('passwordMismatch')" />
            @if (resetForm.get('confirmPassword')?.touched && resetForm.hasError('passwordMismatch')) {
              <span class="error-msg">Passwords do not match</span>
            }
          </div>

          <button type="submit" class="submit-btn" [disabled]="isLoading || resetForm.invalid">
            @if (isLoading) {
              <span class="spinner-sm"></span>
            } @else {
              Reset Password
            }
          </button>
        </form>

        <div class="divider" *ngIf="successMessage"></div>
        <p class="switch-link" *ngIf="successMessage">
          <a routerLink="/login">Go to Login</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      background: #121212;
      padding: 2rem;
      overflow-y: auto;
    }

    .auth-card {
      margin: auto;
      background: #121212;
      padding: 2.5rem;
      border-radius: 8px;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #fff;
      margin-bottom: 2rem;
      svg { color: #1DB954; }
      span { font-size: 1.5rem; font-weight: 700; }
    }

    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: #b3b3b3; margin-bottom: 2rem; font-size: 0.875rem; }

    .alert {
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      text-align: left;
      &.alert-error {
        background: rgba(233, 20, 41, 0.1);
        color: #E91429;
        border: 1px solid rgba(233, 20, 41, 0.3);
      }
      &.alert-success {
        background: rgba(29, 185, 84, 0.1);
        color: #1DB954;
        border: 1px solid rgba(29, 185, 84, 0.3);
      }
    }

    .form-group {
      text-align: left;
      margin-bottom: 1.5rem;
      label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #fff; }
      input {
        width: 100%;
        padding: 0.75rem 1rem;
        background: #3E3E3E;
        border: 1px solid transparent;
        border-radius: 4px;
        color: #fff;
        font-size: 1rem;
        transition: border-color 0.2s;
        &::placeholder { color: #727272; }
        &:focus { outline: none; border-color: #fff; }
        &.error { border-color: #E91429; }
      }
      .error-msg { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #E91429; }
    }

    .submit-btn {
      width: 100%;
      padding: 0.875rem;
      background: #1DB954;
      color: #000;
      border: none;
      border-radius: 500px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      &:hover:not(:disabled) { background: #1ed760; transform: scale(1.01); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .spinner-sm {
      width: 20px; height: 20px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: #000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .divider {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0 1.5rem;
      color: #727272;
      font-size: 0.875rem;
      &::before, &::after { content: ''; flex: 1; height: 1px; background: #282828; }
    }

    .switch-link {
      color: #B3B3B3;
      font-size: 0.875rem;
      a { color: #fff; font-weight: 700; text-decoration: underline; &:hover { color: #1DB954; } }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Invalid password reset link.';
    }
  }

  private passwordMatchValidator(form: FormGroup): { passwordMismatch: boolean } | null {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    const password = this.resetForm.get('password')?.value;
    
    this.authService.resetPassword(password, this.token).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'An error occurred. Please try again.';
      }
    });
  }
}
