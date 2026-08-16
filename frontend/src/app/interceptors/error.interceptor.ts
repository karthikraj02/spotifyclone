import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

// Auth form endpoints intentionally excluded from global handling: login/register/
// forgot/reset-password screens already display err.error?.message inline, and a
// wrong-password 401 there is normal user input, not a session expiry.
const AUTH_FORM_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

// Endpoints that already render their own success/error feedback in the component
// that calls them, so the generic mutating-action toast below would just be noise
// on top of a message the user already saw (e.g. "Added to <playlist>" / "Already
// in <playlist>" for the add-to-playlist menu).
const SELF_HANDLED_MUTATIONS: RegExp[] = [
  /\/playlists\/[^/]+\/songs$/
];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const isAuthFormEndpoint = AUTH_FORM_ENDPOINTS.some(ep => req.url.includes(ep));
  const isSelfHandled = SELF_HANDLED_MUTATIONS.some(re => re.test(req.url));
  const isMutating = req.method !== 'GET';

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthFormEndpoint) {
        // A previously-logged-in session just went invalid (expired/revoked token).
        // Clear it and bounce to login once, carrying a safe returnUrl so the user
        // lands back where they were. Guarded by isLoggedIn() so this only fires
        // once per session instead of once per in-flight request.
        if (authService.isLoggedIn()) {
          toastService.show('Your session has expired. Please log in again.', 'info');
          authService.logout(router.url);
        }
      } else if (error.status === 403) {
        toastService.show(error.error?.message || "You don't have permission to do that.", 'error');
      } else if (error.status === 429) {
        toastService.show(error.error?.message || 'Too many requests. Please slow down and try again shortly.', 'error');
      } else if (error.status >= 500) {
        // Never surface error.error?.message here - the backend already collapses
        // 500s to a generic message in production, but this is an extra guard
        // against ever rendering a raw stack trace/db error to the user.
        toastService.show('Something went wrong on our end. Please try again.', 'error');
      } else if (isMutating && error.status >= 400 && !isAuthFormEndpoint && !isSelfHandled) {
        // Background actions (like, follow, add-to-playlist, admin mutations, etc.)
        // that don't already have dedicated inline error UI still deserve visible
        // feedback instead of failing silently.
        toastService.show(error.error?.message || 'That action could not be completed.', 'error');
      }
      return throwError(() => error);
    })
  );
};
