import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss'
})
export class InspectionsComponent {

  constructor() { }



}
