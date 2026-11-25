// auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

// Token yalnız öz API-mizə gedir: başqa ünvana (xəritə plitələri, xarici fayl) sorğu getsə sızmasın.
const apiOrigin = new URL(environment.apiUrl).origin;

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router); // inject Router for navigation
    const token = localStorage.getItem('auth_token');

    if (token && new URL(req.url, window.location.origin).origin === apiOrigin) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error) => {
            // Uğursuz şifrə/email üçün /auth/login adətən 401 qaytarır; bu halda yönləndirmə
            // etməməliyik — komponent özü xəta mesajı göstərir. Əks halda mövcud sessiya
            // pozulur və istifadəçi təsadüfən əsas girişə düşür.
            const isLoginAttempt = req.url.toLowerCase().includes('/auth/login');
            if (error.status === 401 && !isLoginAttempt) {
                localStorage.removeItem('auth_token');
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
