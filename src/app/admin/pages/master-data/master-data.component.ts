import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { AdminBreadcrumbComponent } from '../../shared/breadcrumb/admin-breadcrumb.component';
import { SectionsComponent } from '../sections/sections.component';
import { CategoriesComponent } from '../categories/categories.component';

@Component({
  selector: 'app-master-data',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    AdminBreadcrumbComponent,
    SectionsComponent,
    CategoriesComponent
  ],
  templateUrl: './master-data.component.html',
  styleUrl: './master-data.component.scss'
})
export class MasterDataComponent {}
