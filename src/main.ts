import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Bütün provider-lər app.config.ts-dədir (vahid mənbə)
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
