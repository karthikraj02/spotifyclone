import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-box">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <h1>Verify Your Email</h1>
        </div>

        <div class="message-box">
          <p>We've sent a 6-digit verification code to:</p>
          <p class="email-display">{{ email }}</p>
        </div>

        <form [formGroup]="verifyForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="otp">Verification Code</label>
            <input 
              type="text" 
              id="otp" 
              formControlName="otp" 
              placeholder="000000"
              maxlength="6"
              [class.error]="verifyForm.get('otp')?.invalid && verifyForm.get('otp')?.touched"
            >
            @if (verifyForm.get('otp')?.invalid && verifyForm.get('otp')?.touched) {
              <span class="error-msg">Please enter a valid 6-digit code.</span>
            }
          </div>

          @if (errorMsg) {
            <div class="error-alert">{{ errorMsg }}</div>
          }

          <button type="submit" [disabled]="verifyForm.invalid || isLoading" class="submit-btn">
            {{ isLoading ? 'Verifying...' : 'Verify' }}
          </button>
        </form>

        <div class="auth-links">
          <p><a routerLink="/login">Back to log in</a></p>
        </div>
      </div>
    </div>
  `
})
export class VerifyOtpComponent {
  verifyForm: FormGroup;
  isLoading = false;
  errorMsg = '';
  email = '';

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
        this.router.navigate(['/login']);
      }
    });
  }

  onSubmit() {
    if (this.verifyForm.valid && this.email) {
      this.isLoading = true;
      this.errorMsg = '';
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
}
