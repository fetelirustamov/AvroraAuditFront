import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupsAddComponent } from './groups-add.component';
import { appTestProviders } from '../../../../../../testing/test-providers';

describe('GroupsAddComponent', () => {
  let component: GroupsAddComponent;
  let fixture: ComponentFixture<GroupsAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [GroupsAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupsAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
