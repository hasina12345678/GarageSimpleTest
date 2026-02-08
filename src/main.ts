import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { bootstrapApplication } from '@angular/platform-browser';
import { ErrorHandler } from '@angular/core';
import {
	PreloadAllModules,
	provideRouter,
	RouteReuseStrategy,
	withPreloading
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// import { OneSignal } from '@awesome-cordova-plugins/onesignal/ngx';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

// ⭐⭐⭐ Gestionnaire d'erreur global ⭐⭐⭐
class GlobalErrorHandler implements ErrorHandler {
	handleError(error: Error): void {
		console.error('🔴 ERREUR GLOBALE:', error);
		// L'app ne doit pas crasher même avec des erreurs non traitées
	}
}

bootstrapApplication(AppComponent, {
	providers: [
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		{ provide: ErrorHandler, useClass: GlobalErrorHandler },
		provideIonicAngular(),
		provideRouter(routes, withPreloading(PreloadAllModules)),
		provideHttpClient(),

		// ⭐⭐⭐ AJOUTEZ OneSignal AUX PROVIDERS ⭐⭐⭐
		// OneSignal,

		// Configuration Firebase
		provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
		provideAuth(() => getAuth()),
		provideFirestore(() => getFirestore())
	]
})
	.catch((err) => console.error('❌ Erreur bootstrap:', err));