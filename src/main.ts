import { bootstrapApplication } from '@angular/platform-browser';
import { ErrorHandler, importProvidersFrom } from '@angular/core';
import { provideRouter, RouteReuseStrategy, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, IonicModule } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Gestionnaire d'erreurs global
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    console.error('🔴 ERREUR GLOBALE:', error);
  }
}

// bootstrap avec IonicModule importé correctement
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    importProvidersFrom(IonicModule) // ✅ ici, pas de forRoot() nécessaire
  ]
})
.catch(err => console.error('❌ Erreur bootstrap:', err));
