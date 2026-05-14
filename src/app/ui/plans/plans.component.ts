import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../file-manager/sidebar/sidebar.component';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss'
})
export class PlansComponent {

}
