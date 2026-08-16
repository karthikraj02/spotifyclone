import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Order matters: authInterceptor attaches the token on the way out, then
    // errorInterceptor inspects the response on the way back (a 401 there means
    // the token authInterceptor attached was rejected).
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations()
  ]
};
