import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';

@Directive({
    selector: '[hasRole]',
    standalone: true,
    // directive: [CommonModule]
})
export class HasRoleDirective implements OnInit {
    @Input('hasRole') roles!: string | string[];
    private hasView = false;

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private authService: AuthService
    ) { }

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            this.updateView();
        });
    }

    private updateView() {
        const roles = Array.isArray(this.roles) ? this.roles : [this.roles];
        const hasRole = this.authService.hasAnyRole(roles);

        if (hasRole && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!hasRole && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
} 