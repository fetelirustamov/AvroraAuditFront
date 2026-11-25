import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnswerDetailsComponent } from './answer-details.component';
import { appTestProviders } from '../../../../testing/test-providers';

describe('AnswerDetailsComponent', () => {
  let component: AnswerDetailsComponent;
  let fixture: ComponentFixture<AnswerDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [appTestProviders],
      imports: [AnswerDetailsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AnswerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
