import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerApproveDetailsComponent } from './answer-approve-details.component';
import { appTestProviders } from '../../../../../testing/test-providers';

describe('AnswerApproveDetailsComponent', () => {
  let component: AnswerApproveDetailsComponent;
  let fixture: ComponentFixture<AnswerApproveDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [AnswerApproveDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnswerApproveDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
