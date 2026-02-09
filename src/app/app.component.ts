import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Capacitor } from '@capacitor/core';

// Firebase (lazy & sécurisé
import { initializeApp } from '@angular/fire/app';
import { getAuth } from '@angular/fire/auth';
import { getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';

// Ionicons
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  carOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  warningOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { IonApp, IonRouterOutlet } from "@ionic/angular/standalone";

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, IonApp, IonRouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  firebaseReady = false;

  constructor(private platform: Platform) {}

  async ngOnInit() {
    try {
      console.log('⏳ Attente platform...');
      await this.platform.ready();
      console.log('✅ Platform ready');

      this.loadIcons();

      // 🔥 Firebase UNIQUEMENT sur mobile natif
      if (Capacitor.isNativePlatform()) {
        await this.safeInitFirebase();
      } else {
        console.log('🌐 Mode WEB → Firebase ignoré');
      }

    } catch (err) {
      console.error('❌ ERREUR INIT APP (NON BLOQUANTE):', err);
    }
  }

  // 🔐 Initialisation Firebase SÉCURISÉE
  private async safeInitFirebase() {
    try {
      console.log('🔥 Initialisation Firebase...');
      
      const app = initializeApp(environment.firebaseConfig);

      // ⚠️ NE PAS stocker globalement si erreur
      getAuth(app);
      getFirestore(app);

      this.firebaseReady = true;
      console.log('✅ Firebase prêt');
    } catch (err) {
      console.error('🚨 Firebase ERROR (IGNORÉ):', err);
      console.warn('⚠️ L’app continue SANS Firebase');
    }
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
        informationCircleOutline
      });
      console.log('✅ Icônes chargées');
    } catch (err) {
      console.warn('⚠️ Erreur icônes (ignorée)');
    }
  }
}
