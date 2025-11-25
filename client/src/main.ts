import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Filter out harmless Google service errors blocked by browser extensions
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  // Suppress Google Play and Google Maps errors blocked by extensions
  if (
    message.includes('play.google.com') ||
    message.includes('maps.googleapis.com') ||
    message.includes('ERR_BLOCKED_BY_CLIENT')
  ) {
    return; // Silently ignore these harmless errors
  }
  originalError.apply(console, args);
};

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
