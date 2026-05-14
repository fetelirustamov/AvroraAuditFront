import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-admin-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-breadcrumb.component.html',
  styleUrl: './admin-breadcrumb.component.scss'
})
export class AdminBreadcrumbComponent {
  @Input() title = '';
  @Input() icon?: string;
  @Input() crumbs: BreadcrumbItem[] = [];
}
