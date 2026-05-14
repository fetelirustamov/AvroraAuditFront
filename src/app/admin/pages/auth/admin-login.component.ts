import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
    templateUrl: './admin-login.component.html',
    styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
    form: FormGroup;
    loading = false;
    error = '';
    private returnUrl: string = '/admin';
    hide = true;

    constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required]]
        });
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.loading = true;
        const { email, password } = this.form.value;
        this.auth.login(email, password).subscribe({
            next: () => {
                this.loading = false;
                if (this.auth.hasRole('Admin')) this.router.navigateByUrl(this.returnUrl || '/admin');
                else this.router.navigate(['/unauthorized']);
            },
            error: () => {
                this.loading = false;
                this.error = 'Giriş alınmadı. Yenidən cəhd edin';
            }
        });
    }
} 