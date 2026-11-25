import { Injectable } from '@angular/core';

/** Təsdiq siyahısının detal səhifəsinə keçib qayıdanda bərpa olunan vəziyyəti. */
export interface InspectionApproveSnapshot {
  formValue: unknown;
  filter: Record<string, string>;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class InspectionApproveCacheService {
  private snapshot: InspectionApproveSnapshot | null = null;

  save(snapshot: InspectionApproveSnapshot): void {
    this.snapshot = snapshot;
  }

  /** Oxuyur və yaddaşdan silir — bir dəfəlik geri qayıdış üçün. */
  consumeSnapshot(): InspectionApproveSnapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }
}
