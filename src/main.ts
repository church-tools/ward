import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
// import { setTheme } from '@fluentui/web-components';
// import { webLightTheme } from '@fluentui/tokens';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// setTheme(webLightTheme);