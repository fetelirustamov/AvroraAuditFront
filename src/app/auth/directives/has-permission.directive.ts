import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PageAction, PermissionService } from '../permission.service';

/** `*hasPermission="'questions:edit'"` və ya `*hasPermission="{ page:'questions', action:'delete' }"`. */
type PermissionSpec = string | { page: string; action: PageAction };

/**
 * Elementi cari istifadəçinin səhifə icazəsinə görə göstərir/gizlədir.
 * Düymə səviyyəsində (add/edit/delete) istifadə üçün. Rol əsaslı köhnə
 * `*hasRole`-un icazə əsaslı əvəzidir.
 */
@Directive({
    selector: '[hasPermission]',
    standalone: true,
})
export class HasPermissionDirective {
    private readonly tpl = inject(TemplateRef<unknown>);
    private readonly vcr = inject(ViewContainerRef);
    private readonly permissions = inject(PermissionService);

    readonly hasPermission = input.required<PermissionSpec>();
    private visible = false;

    constructor() {
        // Signal-lara reaktivdir: icazələr yüklənəndə görünürlük avtomatik yenilənir.
        effect(() => {
            const { page, action } = this.parse(this.hasPermission());
            const allowed = this.permissions.can(page, action);

            if (allowed && !this.visible) {
                this.vcr.createEmbeddedView(this.tpl);
                this.visible = true;
            } else if (!allowed && this.visible) {
                this.vcr.clear();
                this.visible = false;
            }
        });
    }

    private parse(spec: PermissionSpec): { page: string; action: PageAction } {
        if (typeof spec === 'string') {
            const [page, action] = spec.split(':');
            return { page, action: (action as PageAction) || 'show' };
        }
        return spec;
    }
}
