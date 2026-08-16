import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-otp',
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
        <h1>Verify your email</h1>

        <div class="message-box">
          <p>We've sent a 6-digit verification code to:</p>
          <p class="email-highlight">{{ email }}</p>
        </div>

        @if (errorMsg) {
          <div class="alert alert-error">{{ errorMsg }}</div>
        }
        @if (successMsg) {
          <div class="alert alert-success">{{ successMsg }}</div>
        }

        <form [formGroup]="verifyForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="otp">Verification Code</label>
            <input
              id="otp"
              type="text"
              formControlName="otp"
              placeholder="Enter 6-digit code"
              maxlength="6"
              autocomplete="one-time-code"
              [class.error]="verifyForm.get('otp')?.invalid && verifyForm.get('otp')?.touched"
            />
            @if (verifyForm.get('otp')?.invalid && verifyForm.get('otp')?.touched) {
              <span class="error-msg">Please enter a valid 6-digit code.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary submit-btn" [disabled]="verifyForm.invalid || isLoading">
            @if (isLoading) {
              <span class="spinner-sm"></span>
            } @else {
              Verify & Continue
            }
          </button>
        </form>

        <div class="resend-section">
          <p class="resend-text">Didn't receive the code?</p>
          <button
            class="resend-btn"
            [disabled]="resendCooldown > 0 || isResending"
            (click)="resendOtp()"
          >
            @if (isResending) {
              <span class="spinner-sm"></span> Sending...
            } @else if (resendCooldown > 0) {
              Resend code in {{ resendCooldown }}s
            } @else {
              Resend code
            }
          </button>
        </div>

        <div class="divider"><span>or</span></div>

        <p class="switch-link">
          <a routerLink="/register">Back to sign up</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      background: var(--bg-primary);
      padding: 2rem;
      overflow-y: auto;
    }

    .auth-card {
      margin: auto;
      background: var(--bg-primary);
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
      color: var(--text-primary);
      margin-bottom: 2rem;

      svg { color: #1DB954; }
      span { font-size: 1.5rem; font-weight: 700; }
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 2rem;
    }

    .message-box {
      margin-bottom: 1.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;

      .email-highlight {
        color: var(--text-primary);
        font-weight: 600;
        margin-top: 0.25rem;
      }
    }

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
      margin-bottom: 1rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      input {
        width: 100%;
        padding: 0.75rem 1rem;
        background: var(--bg-elevated);
        border: 1px solid transparent;
        border-radius: 4px;
        color: var(--text-primary);
        font-size: 1.25rem;
        letter-spacing: 0.35em;
        text-align: center;
        transition: border-color 0.2s;

        &::placeholder { color: var(--text-muted); letter-spacing: normal; font-size: 1rem; }
        &:focus { outline: none; border-color: var(--text-primary); }
        &.error { border-color: #E91429; }
      }

      .error-msg {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: #E91429;
      }
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
      margin-top: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &:hover:not(:disabled) { background: #1ed760; transform: scale(1.01); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .resend-section {
      margin-top: 1.5rem;
      text-align: center;

      .resend-text {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
      }

      .resend-btn {
        background: transparent;
        border: 1px solid var(--text-muted);
        color: var(--text-primary);
        padding: 0.5rem 1.5rem;
        border-radius: 500px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;

        &:hover:not(:disabled) {
          border-color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner-sm {
          width: 14px;
          height: 14px;
        }
      }
    }

    .spinner-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0,0,0,0.3);
      border-top-color: #000;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .resend-btn .spinner-sm {
      border-color: rgba(255,255,255,0.3);
      border-top-color: var(--text-primary);
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .divider {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin: 1.5rem 0;
      color: var(--text-muted);
      font-size: 0.875rem;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--bg-tertiary);
      }
    }

    .switch-link {
      color: var(--text-secondary);
      font-size: 0.875rem;

      a {
        color: var(--text-primary);
        font-weight: 700;
        text-decoration: underline;
        &:hover { color: #1DB954; }
      }
    }
  `]
})
export class VerifyOtpComponent implements OnDestroy {
  verifyForm: FormGroup;
  isLoading = false;
  isResending = false;
  errorMsg = '';
  successMsg = '';
  email = '';
  resendCooldown = 0;
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.verifyForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      if (!this.email) {
        this.router.navigate(['/register']);
      }
    });

    // Start with a 60s cooldown since an OTP was just sent during registration
    this.startCooldown();
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  onSubmit(): void {
    if (this.verifyForm.valid && this.email) {
      this.isLoading = true;
      this.errorMsg = '';
      this.successMsg = '';
      const otp = this.verifyForm.get('otp')?.value;

      this.authService.verifyOtp(this.email, otp).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.errorMsg = error.error?.message || 'Verification failed. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  resendOtp(): void {
    if (this.resendCooldown > 0 || this.isResending || !this.email) return;

    this.isResending = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.authService.resendOtp(this.email).subscribe({
      next: (res) => {
        this.isResending = false;
        this.successMsg = res.message || 'A new code has been sent to your email.';
        this.startCooldown();
      },
      error: (err) => {
        this.isResending = false;
        this.errorMsg = err.error?.message || 'Failed to resend code. Please try again.';
      }
    });
  }

  private startCooldown(): void {
    this.resendCooldown = 60;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.resendCooldown = 0;
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
      }
    }, 1000);
  }
}
