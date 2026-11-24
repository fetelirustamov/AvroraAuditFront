import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPermissionComponent } from './user-permission.component';
import { appTestProviders } from '../../../../../testing/test-providers';

describe('UserPermissionComponent', () => {
  let component: UserPermissionComponent;
  let fixture: ComponentFixture<UserPermissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [UserPermissionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPermissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
