import { Component } from '@angular/core';
import { ToggleService } from '../common/header/toggle.service';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './admin.component.html',
  // Çərçivə əsas tətbiqlə eynidir; ikinci fayl admin səhifələrinin forma/cədvəl stilləridir
  styleUrls: ['../ui/ui.component.scss', './admin.component.scss']
})
export class AdminComponent {

  isSidebarToggled = false;

  constructor(private toggleService: ToggleService) {
    this.toggleService.isSidebarToggled$.subscribe(isSidebarToggled => {
      this.isSidebarToggled = isSidebarToggled;
    });
  }

}
