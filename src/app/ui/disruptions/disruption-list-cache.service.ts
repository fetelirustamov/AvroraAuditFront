import { Injectable } from '@angular/core';
import { TableState } from '../../models/table-state.model';
import { InspectionPlan } from '../inspections/InpectionPlan.model';

export interface DisruptionListSnapshot {
  tableState: TableState;
  dataSource: InspectionPlan[];
  allDataCount: number;
  searchTerm: string;
  pageSize: number;
  disruptionStatus: number;
  inspectionsFormValue: unknown;
}

@Injectable({ providedIn: 'root' })
export class DisruptionListCacheService {
  private snapshot: DisruptionListSnapshot | null = null;

  save(snapshot: DisruptionListSnapshot): void {
    this.snapshot = snapshot;
  }

  consumeSnapshot(): DisruptionListSnapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }
}
