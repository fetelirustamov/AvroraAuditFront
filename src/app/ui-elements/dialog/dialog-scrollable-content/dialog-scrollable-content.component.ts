import { Component } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    selector: 'app-dialog-scrollable-content',
    imports: [MatButtonModule, MatDialogModule, MatCardModule],
    templateUrl: './dialog-scrollable-content.component.html',
    styleUrl: './dialog-scrollable-content.component.scss'
})
export class DialogScrollableContentComponent {

    // Dialog with header, scrollable content and actions
    constructor(
        public dialog: MatDialog
    ) {}
    
    openDialog() {
        const dialogRef = this.dialog.open(DialogContentExampleDialog);
        dialogRef.afterClosed().subscribe(result => {
            console.log(`Dialog result: ${result}`);
        });
    }

}

// Dialog Overview Example Dialog
@Component({
    selector: 'dialog-content-example-dialog',
    standalone: true,
    templateUrl: 'dialog-content-example-dialog.html',
    imports: [MatDialogModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButtonModule, A11yModule]
})
export class DialogContentExampleDialog {}