import { NgClass, NgIf } from '@angular/common';
import { Component, Input, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { InspectionsListComponent } from '../../../inspections/inspections-list/inspections-list.component';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-inspections-result',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatMenuModule, MatTabsModule, MatTableModule, MatPaginatorModule, InspectionsListComponent],
  templateUrl: './inspections-result.component.html',
  styleUrl: './inspections-result.component.scss'
})
export class InspectionsResultComponent {
  displayedColumns: string[] = ['id', 'product', 'category', 'price', 'order', 'stock', 'amount', 'rating', 'status', 'action'];
  // dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  @Input() data: any;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  public receivedData: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      console.log('Yeni dataa gəldi:', changes['data'].currentValue);
      this.receivedData = changes['data'].currentValue;
      // Burada yeni gələn dəyərə görə fill və ya filter metodu çağıra bilərsən
    }
  }

  ngOnInit(): void {
    console.log("result komponentinə gələn data:", this.data);
  }

  ngAfterViewInit() {
    // this.dataSource.paginator = this.paginator;
  }

  // Search Filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    // this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  constructor() {
    console.log(this.data);
  }

}



