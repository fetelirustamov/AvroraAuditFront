import { Component, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { CustomizerSettingsService } from '../../../customizer-settings/customizer-settings.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { Observable } from 'rxjs';
import { Firm } from '../../inspections/firm.model';
import { InspectionsService } from '../../inspections/inspections.service';
import { PlanService } from '../plan.service';
import { User } from '../user.model';
import { TableService } from '../../services/table.service';
import { NotificationService } from '../../../shared/services/notification.service';

export interface PeriodicElement {
  customer: any;
  email: string;
  planned: number;
  confirmed: number;
  expired: number;
  finished: number;
  action: any;
}



@Component({
  selector: 'app-plan-user-list',
  standalone: true,
  imports: [MatCardModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatNativeDateModule, MatButtonModule, MatPaginatorModule, MatTableModule, MatCheckboxModule, MatMenuModule, NgFor],
  templateUrl: './plan-user-list.component.html',
  styleUrl: './plan-user-list.component.scss'
})



export class PlanUserListComponent {
  displayedColumns: string[] = ['select', 'customer', 'email', 'planned', 'confirmed', 'expired', 'finished'];
  dataSource = new MatTableDataSource<any>;
  selection = new SelectionModel<PeriodicElement>(true, []);

  @ViewChild(MatPaginator)
  set matPaginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }

  /** Whether the number of selected elements matches the total number of rows. */



  public selectedFirmId: number = 0;
  public selectedLocationId: number = 0;
  public firms: Firm[] = [];
  public users$: Observable<User[]> = new Observable<User[]>();
  public pageSize: number[] = [10, 25];

  constructor(
    private inspectionsService: InspectionsService,
    private planService: PlanService,
    public themeService: CustomizerSettingsService,
    private router: Router,
    private notify: NotificationService,
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras.state as { message: string };

    if (state?.message) {
      this.notify.success(state.message);
    }

    this.getFirms();
  }


  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }
  checkboxLabel(row?: PeriodicElement): string {

    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.customer + 1}`;

  }


  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);


  }


  getFirms() {
    this.inspectionsService.getFirms().subscribe((response) => {
      this.firms = response.data;
    });
  }

  getInspectors(firmId: number) {
    this.planService.getInspectors(firmId, 3).subscribe((response) => {
      const transformed = response.data.map(user => ({
        ...user,
        customer: {
          name: `${user.name} ${user.surName}`.trim(),
          userCode: user.userCode
        }
      }));

      this.dataSource.data = transformed;


    })

  }

  onPlanClick() {
    if (this.selection.selected.length === 0) {
      this.notify.warning('Heç bir istifadəçi seçilməyib!', {
        message: 'Zəhmət olmasa ən azı bir istifadəçi seçin.',
      });
      return;
    }

    let data: any = {
      selected: this.selection.selected.filter((item) => item.customer.userCode).map((item) => item.customer.userCode),
      organization: this.selectedFirmId,
    };

    this.router.navigate(["plans/create"], {
      state: { data: data },
    });
  }

  onSelectFirm(selectedFirmId: number) {
    this.selectedFirmId = selectedFirmId;
    this.getInspectors(selectedFirmId);
  }


}




