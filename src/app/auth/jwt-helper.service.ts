// jwt-helper.service.ts
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
@Injectable({
    providedIn: 'root'
})
export class JwtHelperService {
    constructor() { }

    getDecodedToken() {
        const token = localStorage.getItem('auth_token');
        if (token) {
            return jwtDecode(token);
        }
        return null;
    }
}


