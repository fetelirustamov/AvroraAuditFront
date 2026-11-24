import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
    selector: 'app-sign-in',
    imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, ReactiveFormsModule, CommonModule],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.scss',
    standalone: true
})
export class SignInComponent implements OnInit {
    // Password Hide
    hide = true;
    loginForm!: FormGroup;
    isLoading = false;
    errorMessage = '';
    returnUrl: string = '/dashboard';

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.createForm();
        // Get return url from route parameters or default to '/dashboard'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    }

    createForm() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(5)]]
        });
    }

    login(): void {
        if (!this.loginForm.valid) {
            this.loginForm.markAllAsTouched();
            this.errorMessage = 'İstifadəçi adı və şifrə boş ola bilməz və düzgün formatda olmalıdır.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const email = this.loginForm.get('email')?.value;
        const password = this.loginForm.get('password')?.value;

        this.authService.login(email, password).subscribe({
            next: (response) => {
                if (response && response.token) {
                    // Navigate to return url after successful login
                    this.router.navigateByUrl(this.returnUrl || '/dashboard');
                } else {
                    this.errorMessage = 'Serverdən gözlənilməz cavab gəldi.';
                }
            },
            error: (error) => {
                this.errorMessage = this.loginErrorMessage(error);
                this.isLoading = false;
            },
            complete: () => {
                this.isLoading = false;
            }
        });
    }

    // Şəbəkə xətası, server xətası və yanlış parol fərqli səbəblərdir —
    // hamısına "şifrənizi yoxlayın" demək istifadəçini yanıldır.
    private loginErrorMessage(error: any): string {
        const status = error?.status;

        if (status === 0) {
            return 'Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın.';
        }
        if (status === 400 || status === 401) {
            return 'Xətalı giriş. Şifrənizi və ya istifadəçi adınızı yoxlayın.';
        }
        if (status === 403) {
            return 'Bu hesabın sistemə girişi bağlanıb.';
        }
        if (status >= 500) {
            return 'Serverdə xəta baş verdi. Bir az sonra yenidən cəhd edin.';
        }
        return 'Giriş zamanı gözlənilməz xəta baş verdi. Yenidən cəhd edin.';
    }
}
