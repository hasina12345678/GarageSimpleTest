// import { Component, OnInit, inject } from '@angular/core';
// import { IonicModule, Platform } from '@ionic/angular';
// import { Capacitor } from '@capacitor/core';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   standalone: true,
//   imports: [IonicModule]
// })
// export class AppComponent implements OnInit {
//   private platform = inject(Platform);

//   async ngOnInit() {
//     // Gestion globale des erreurs
//     if (Capacitor.getPlatform() === 'android') {
//       window.addEventListener('error', (e) => {
//         console.error('APP ERROR:', e.error);
//         this.showErrorToast(e.error?.message || 'Une erreur est survenue');
//       });
//     }

//     try {
//       // Attendre que Capacitor soit prêt
//       const platformReady = Promise.race([
//         this.platform.ready(),
//         new Promise((_, reject) => setTimeout(() => reject(new Error('Platform timeout')), 5000))
//       ]);

//       await platformReady;
	  
//       console.log('✅ Application initialisée, attente de connexion...');
//     } catch (error) {
//       console.error('❌ Erreur critique initialisation:', error);
//     }
//   }

//   private showErrorToast(message: string) {
//     console.error('Toast error:', message);
//   }
// }

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { IonicModule, Platform } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  // Ajoutez TOUTES les icônes que vous utilisez dans l'app
  logOutOutline,
  carOutline, 
  alertCircleOutline, 
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  warningOutline,
  informationCircleOutline,
  // Ajoutez d'autres icônes que vous utilisez
  homeOutline,
  settingsOutline,
  personOutline,
  // ... etc.
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, IonicModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'votre-app';

  constructor(private platform: Platform) {}

  async ngOnInit() {
    // Attendre que la plateforme soit prête
    await this.platform.ready();
    
    // Charger toutes les icônes après que la plateforme est prête
    this.loadIcons();
  }

  private loadIcons() {
    try {
      addIcons({
        logOutOutline,
        carOutline, 
        alertCircleOutline, 
        checkmarkCircleOutline,
        timeOutline,
        calendarOutline,
        warningOutline,
        informationCircleOutline,
        // Ajoutez toutes les autres icônes que vous utilisez
      });
      console.log('✅ Icônes chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur chargement icônes:', error);
    }
  }
}