import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// Firebase
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
import { IonRouterOutlet, IonApp } from "@ionic/angular/standalone";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
    // ❌ plus besoin de IonApp ni IonRouterOutlet
    ,
    IonRouterOutlet,
    IonApp
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

	auth: any;
	firestore: any;

  	constructor(private platform: Platform) {}

	async ngOnInit() {
		await this.platform.ready();

		// 🔹 Ne lancer Firebase que sur mobile
		if (this.platform.is('capacitor')) {
			try {
			const app = initializeApp(environment.firebaseConfig);
			this.auth = getAuth(app);
			this.firestore = getFirestore(app);
			console.log('✅ Firebase initialisé sur mobile');
			} catch (err) {
			console.error('❌ Erreur Firebase:', err);
			}
		} else {
			console.log('💡 Firebase non initialisé (web)');
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
    } catch (err) {
      console.error('❌ Erreur chargement icônes:', err);
    }
  }
}
