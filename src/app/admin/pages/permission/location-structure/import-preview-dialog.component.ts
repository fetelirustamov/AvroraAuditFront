import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** İdxalda ötürülən (göndərilməyən) fayl sətri. */
export interface ImportIssue { row: number; message: string; }

/** Bir mağazanın zəncirinin əvəz olunması: hazırkı → yeni (aşağıdan yuxarı, 1-ci pillədən). */
export interface ImportPreviewRow {
  code: number;
  name: string;
  current: string[];
  next: string[];
  unchanged: boolean;
}

export interface ImportPreviewData {
  networkName: string;
  rows: ImportPreviewRow[];
  issues: ImportIssue[];
}

/**
 * Excel idxalından əvvəl təsdiq: hansı mağazaların zənciri nə ilə əvəz olunacaq.
 * İdxal qəsdən dağıdıcıdır (köhnə zəncir tam silinir), ona görə yalnız "true" ilə bağlananda göndərilir.
 */
@Component({
  selector: 'app-import-preview-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './import-preview-dialog.component.html',
  styleUrl: './import-preview-dialog.component.scss'
})
export class ImportPreviewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImportPreviewData,
    private dialogRef: MatDialogRef<ImportPreviewDialogComponent, boolean>
  ) { }

  get unchangedCount(): number { return this.data.rows.filter(r => r.unchanged).length; }

  confirm(): void { this.dialogRef.close(true); }
  cancel(): void { this.dialogRef.close(false); }
}
