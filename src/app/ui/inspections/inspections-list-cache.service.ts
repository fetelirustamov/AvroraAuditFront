import { Injectable } from '@angular/core';
import { TableState } from '../../models/table-state.model';
import { InspectionPlan } from './InpectionPlan.model';

export interface InspectionsListSnapshot {
  tableState: TableState;
  dataSource: InspectionPlan[];
  allDataCount: number;
  searchTerm: string;
  pageSize: number;
  inspectionsFormValue: unknown;
}

@Injectable({ providedIn: 'root' })
export class InspectionsListCacheService {
  private snapshot: InspectionsListSnapshot | null = null;

  save(snapshot: InspectionsListSnapshot): void {
    this.snapshot = snapshot;
  }

  /** Oxuyur və yaddaşdan silir — bir dəfəlik geri qayıdış üçün. */
  consumeSnapshot(): InspectionsListSnapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }
}
