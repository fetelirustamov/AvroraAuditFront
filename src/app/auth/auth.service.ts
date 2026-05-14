import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
    id: string;
    email: string;
    roles: string[];
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly token = 'auth_token';
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    private baseUrl = environment.apiUrl;
    constructor(
        private http: HttpClient,
        private router: Router
    ) {
        this.loadUserFromToken();
    }

    private loadUserFromToken(): void {
        const token = this.getToken();
        if (token) {
            try {
                const decodedToken: any = jwtDecode(token);
                const roles = decodedToken.Role ? decodedToken.Role.split(',').map((role: string) => role.trim()) : [];

                const user: User = {
                    id: decodedToken.Id,
                    email: decodedToken.Email,
                    roles: roles
                };

                this.currentUserSubject.next(user);
            } catch (error) {
                this.logout();
            }
        }

    }


    login(email: string, password: string): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
            tap(response => {
                if (response.token) {
                    localStorage.setItem(this.token, response.token);
                    this.loadUserFromToken();
                }
            })
        );
    }

    logout(): void {
        localStorage.removeItem(this.token);
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.token);
    }


    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    hasRole(role: string): boolean {
        const user = this.currentUserSubject.value;

        return user?.roles.includes(role) || false;
    }

    hasAnyRole(roles: string[]): boolean {
        const user = this.currentUserSubject.value;

        return user?.roles.some(role => roles.includes(role)) || false;
    }

    hasAllRoles(roles: string[]): boolean {
        const user = this.currentUserSubject.value;
        return user?.roles.every(role => roles.includes(role)) || false;
    }

    getUserInfo(): any {
        const token = this.getToken();
        if (!token) return null;
        try {
            // atob + JSON.parse UTF-8 çoxbaytlı simvolları səhv oxuyur; jwtDecode düzgün UTF-8 bərpa edir
            return jwtDecode(token);
        } catch {
            return null;
        }
    }
}