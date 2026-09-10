import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast.service';

/**
 * Functional HTTP interceptor that catches 401/403 responses
 * and redirects the user to the login page.
 *
 * Works for all HttpClient calls (e.g. Affinda, Teams service).
 * Note: Cordys SOAP calls via $.cordys.ajax bypass Angular's HttpClient
 * and are NOT intercepted here.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        toast.error('Your session has expired. Redirecting to login…');
        sessionStorage.clear();
        router.navigate(['/login']);
      } else if (error.status === 0) {
        toast.error('Network error. Please check your connection.');
      } else if (error.status >= 500) {
        toast.error('Server error. Please try again later.');
      }
      return throwError(() => error);
    })
  );
};
