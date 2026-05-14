import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-unauthorized',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
    templateUrl: './unauthorized.component.html',
    styleUrl: './unauthorized.component.scss'
})
export class UnauthorizedComponent { }


