import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';

@Component({
    selector: 'app-sign-in',
    imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, ReactiveFormsModule],
    templateUrl: './sign-in.component.html',
    styleUrl: './sign-in.component.scss',
    standalone: true
})
export class SignInComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly authService = inject(AuthService);

    @ViewChild('emailInput') private emailInput!: ElementRef<HTMLInputElement>;
    @ViewChild('passwordInput') private passwordInput!: ElementRef<HTMLInputElement>;

    readonly loginForm = this.fb.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(5)]]
    });

    hidePassword = true;
    isLoading = false;
    errorMessage = '';
    private returnUrl = '/dashboard';

    ngOnInit(): void {
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    }

    login(): void {
        if (this.isLoading) return;
        this.errorMessage = '';

        // Düymə forma səhv olanda da aktivdir: xətaları göstər, ilk səhv sahəyə keç
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            this.focusFirstInvalid();
            return;
        }

        this.isLoading = true;
        const { email, password } = this.loginForm.getRawValue();

        this.authService.login(email, password)
            .pipe(finalize(() => this.isLoading = false))
            .subscribe({
                next: (response) => {
                    if (response && response.token) {
                        this.router.navigateByUrl(this.returnUrl);
                    } else {
                        this.errorMessage = 'Serverdən gözlənilməz cavab gəldi.';
                    }
                },
                error: (error) => {
                    this.errorMessage = this.loginErrorMessage(error);
                }
            });
    }

    private focusFirstInvalid(): void {
        const { email } = this.loginForm.controls;
        (email.invalid ? this.emailInput : this.passwordInput).nativeElement.focus();
    }

    // Şəbəkə xətası, server xətası və yanlış parol fərqli səbəblərdir —
    // hamısına "parolu yoxlayın" demək istifadəçini yanıldır.
    private loginErrorMessage(error: any): string {
        const status = error?.status;

        if (status === 0) {
            return 'Serverə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın.';
        }
        if (status === 400 || status === 401) {
            return 'E-poçt və ya parol yanlışdır.';
        }
        if (status === 403) {
            return 'Bu hesabın sistemə girişi bağlanıb.';
        }
        // Şəbəkədən dəqiqədə 30-dan çox cəhd və ya hesaba 15 dəqiqədə 10 səhv parol.
        if (status === 429) {
            return 'Həddindən artıq giriş cəhdi. Bir neçə dəqiqə gözləyib yenidən cəhd edin.';
        }
        if (status >= 500) {
            return 'Serverdə xəta baş verdi. Bir az sonra yenidən cəhd edin.';
        }
        return 'Giriş zamanı gözlənilməz xəta baş verdi. Yenidən cəhd edin.';
    }
}
