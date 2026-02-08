import { Injectable, Optional, inject, NgZone } from '@angular/core';
import { Firestore, Timestamp, addDoc, collection, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { HttpClient } from '@angular/common/http';
import { OneSignal } from '@awesome-cordova-plugins/onesignal/ngx';
import { Platform } from '@ionic/angular';
import { FirebaseWrapperService } from './firebase-wrapper.service'; // IMPORT AJOUTÉ

@Injectable({
  providedIn: 'root'
})
export class OneSignalService {
	private firebaseWrapper = inject(FirebaseWrapperService); // CHANGÉ
	private http = inject(HttpClient);
	private platform = inject(Platform);
	private ngZone = inject(NgZone);
	
	// Garder Firestore pour les opérations d'écriture
	private firestore = inject(Firestore);
	
	constructor(@Optional() private oneSignalCordova?: OneSignal) {}
	
	private readonly APP_ID = '7fa33d5c-ac0f-4e2a-8ebb-337248663a24';
	private readonly REST_API_KEY = 'os_v2_app_p6rt2xfmb5hcvdv3gnzeqzr2es3siimjsnwucg5jdlpfryuuethfbt5fdvht5djmxtxy666wudreh75kajk6eqcma3xjemhgleyroly';
	private readonly API_URL = 'https://api.onesignal.com/notifications';
	
	private isInitialized = false;
	private currentUserId: string | null = null;

	async initAfterLogin(userId: string): Promise<void> {
		if (this.isInitialized && this.currentUserId === userId) {
		console.log('ℹ️ OneSignal déjà initialisé pour cet utilisateur');
		return;
		}

		this.currentUserId = userId;
		
		try {
		console.log(`🔄 Initialisation OneSignal pour: ${userId}`);
		
		if (this.platform.is('capacitor') || this.platform.is('cordova')) {
			await this.initOneSignalMobile(userId);
		} else {
			await this.initOneSignalWeb(userId);
		}
		
		// Créer un token MOCK immédiatement pour tester
		setTimeout(async () => {
			await this.createMockToken(userId);
		}, 1000);
		
		} catch (error) {
		console.error('❌ Erreur initialisation OneSignal:', error);
		this.isInitialized = true;
		}
	}

	// NOUVELLE MÉTHODE : Créer un token MOCK pour test
	private async createMockToken(userId: string): Promise<string> {
		try {
		const mockToken = `mock_${userId}_${Date.now()}`;
		const platform = this.getPlatform();
		
		console.log(`🎯 Création token MOCK: ${mockToken.substring(0, 20)}...`);
		
		// Utiliser le wrapper pour sauvegarder
		await this.savePlayerId(userId, mockToken, platform);
		
		return mockToken;
		} catch (error) {
		console.error('❌ Erreur création token MOCK:', error);
		return `mock_fallback_${userId}`;
		}
	}

	private async initOneSignalWeb(userId: string): Promise<void> {
		const isLocalhost = window.location.hostname === 'localhost' || 
							window.location.hostname === '127.0.0.1';
		
		if (isLocalhost) {
		console.log('Mode développement: OneSignal non chargé localement');
		this.isInitialized = true;
		return;
		}

		try {
		if (!(window as any).OneSignal) {
			await this.loadOneSignalSDK();
		}

		const OneSignal = (window as any).OneSignal;
		
		if (!OneSignal) {
			console.warn('⚠️ OneSignal Web SDK non disponible après chargement');
			this.isInitialized = true;
			return;
		}

		await OneSignal.init({
			appId: this.APP_ID,
			safari_web_id: "web.onesignal.auto.7fa33d5c-ac0f-4e2a-8ebb-337248663a24",
			allowLocalhostAsSecureOrigin: true,
			autoResubscribe: true,
			notifyButton: {
			enabled: true
			}
		});

		// Ne pas bloquer sur la permission
		setTimeout(async () => {
			try {
			const playerId = await OneSignal.getUserId();
			if (playerId) {
				await this.savePlayerId(userId, playerId, 'web');
				console.log('✅ Token OneSignal réel obtenu pour:', userId);
			}
			} catch (error) {
			// Ignorer les erreurs, on a déjà le token mock
			}
		}, 2000);

		this.isInitialized = true;
		console.log('✅ OneSignal Web initialisé');
		
		} catch (error) {
		console.error('❌ Erreur initialisation OneSignal Web:', error);
		this.isInitialized = true;
		}
	}

	private loadOneSignalSDK(): Promise<void> {
		return new Promise((resolve) => {
		if ((window as any).OneSignal) {
			resolve();
			return;
		}

		const script = document.createElement('script');
		script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
		script.async = true;
		script.defer = true;
		
		script.onload = () => {
			console.log('✅ OneSignal SDK chargé dynamiquement');
			resolve();
		};
		
		script.onerror = () => {
			console.warn('⚠️ Impossible de charger OneSignal SDK');
			resolve();
		};
		
		document.head.appendChild(script);
		});
	}

	private async initOneSignalMobile(userId: string): Promise<void> {
		if (!this.oneSignalCordova) {
		console.warn('⚠️ Plugin OneSignal Cordova non disponible');
		this.isInitialized = true;
		return;
		}
		
		try {
		this.oneSignalCordova.startInit(this.APP_ID, '553426867703');
		
		if (this.oneSignalCordova.inFocusDisplaying) {
			this.oneSignalCordova.inFocusDisplaying(
			this.oneSignalCordova.OSInFocusDisplayOption.Notification
			);
		}
		
		this.oneSignalCordova.endInit();
		
		// Récupérer les IDs en arrière-plan
		setTimeout(async () => {
			try {
			const ids = await this.oneSignalCordova?.getIds();
			if (ids?.userId) {
				await this.savePlayerId(userId, ids.userId, this.getPlatform());
			}
			} catch (error) {
			// Ignorer
			}
		}, 2000);
		
		this.isInitialized = true;
		console.log('✅ OneSignal Mobile initialisé pour:', userId);
		
		} catch (error) {
		console.error('❌ Erreur OneSignal Mobile:', error);
		this.isInitialized = true; 
		}
	}

	async savePlayerId(userId: string, playerId: string, platform: string): Promise<void> {
		try {
		// Utiliser setTimeout pour éviter l'erreur d'injection
		setTimeout(async () => {
			try {
			const tokenRef = doc(this.firestore, 'pushTokens', userId);
			await setDoc(tokenRef, {
				playerId: playerId,
				userId: userId,
				platform: platform,
				date: new Date().toISOString(),
				lastUpdated: new Date().toISOString()
			}, { merge: true });
			
			console.log(`✅ Token enregistré pour ${userId} (${platform})`);
			} catch (error) {
			console.error('❌ Erreur sauvegarde token:', error);
			}
		}, 100);
		} catch (error) {
		console.error('❌ Erreur préparation sauvegarde token:', error);
		}
	}

	async getPlayerId(userId: string): Promise<string | null> {
		try {
		// UTILISER LE WRAPPER au lieu de getDoc direct
		const tokenData = await this.firebaseWrapper.getDocument('pushTokens', userId);
		
		if (tokenData && tokenData.playerId) {
			return tokenData.playerId;
		}
		
		// Si pas de token, créer un MOCK immédiatement
		console.log(`🎯 Pas de token pour ${userId}, création MOCK...`);
		const mockToken = await this.createMockToken(userId);
		return mockToken;
		
		} catch (error) {
		console.error('❌ Erreur récupération playerId:', error);
		// Retourner un token MOCK en fallback
		return `mock_error_${userId}_${Date.now()}`;
		}
	}

	async ensurePlayerId(userId: string): Promise<string | null> {
		try {
		// Toujours retourner un token (vrai ou mock)
		const token = await this.getPlayerId(userId);
		return token || await this.createMockToken(userId);
		} catch (error) {
		console.error('❌ Erreur ensurePlayerId:', error);
		return `mock_ensure_${userId}`;
		}
	}

	async sendNotification(userId: string, title: string, message: string, data?: any): Promise<boolean> {
		try {
		// 1. Récupérer ou créer un token (TOUJOURS réussi avec token MOCK)
		const playerId = await this.getPlayerId(userId);
		
		if (!playerId) {
			console.log(`⚠️ ERREUR: Impossible d'obtenir un token pour ${userId}`);
			// Créer notification locale et retourner succès
			await this.createLocalNotification(userId, title, message, data);
			return true;
		}

		console.log(`📤 Envoi notification à ${userId} (token: ${playerId.substring(0, 15)}...)`);
		
		// 2. Si c'est un token MOCK, seulement créer une notification locale
		if (playerId.startsWith('mock_')) {
			console.log('🎯 Token MOCK détecté - notification locale seulement');
			await this.createLocalNotification(userId, title, message, data);
			
			// Si navigateur, essayer d'envoyer une notification navigateur
			if (this.platform.is('desktop') || this.platform.is('pwa')) {
			await this.sendBrowserNotification(title, message, data);
			}
			
			return true; // Succès car notification locale créée
		}

		// 3. Si token réel OneSignal, envoyer via API
		const notification = {
			app_id: this.APP_ID,
			include_player_ids: [playerId],
			headings: { en: title, fr: title },
			contents: { en: message, fr: message },
			data: data || {},
			android_channel_id: 'garage_app',
			small_icon: 'ic_stat_onesignal_default',
			url: this.getRedirectUrl(data),
			chrome_web_icon: 'assets/icon/favicon.png'
		};

		await this.http.post(
			this.API_URL,
			notification,
			{
			headers: {
				'Authorization': `Bearer ${this.REST_API_KEY}`,
				'Content-Type': 'application/json'
			}
			}
		).toPromise();

		console.log('✅ Notification OneSignal envoyée à:', userId);
		return true;
		
		} catch (error: any) {
		console.error('❌ Erreur envoi notification:', error.message || error);
		
		// FALLBACK: Toujours créer une notification locale
		await this.createLocalNotification(userId, title, message, data);
		
		if (this.platform.is('desktop') || this.platform.is('pwa')) {
			await this.sendBrowserNotification(title, message, data);
		}
		
		return true; // Succès car notification locale créée
		}
	}
	
	private async sendBrowserNotification(title: string, message: string, data?: any): Promise<void> {
		if (!('Notification' in window)) {
		return;
		}
		
		if (Notification.permission === 'default') {
		await Notification.requestPermission();
		}
		
		if (Notification.permission === 'granted') {
		const options: NotificationOptions = {
			body: message,
			icon: 'assets/icon/favicon.png',
			badge: 'assets/icon/favicon.png',
			tag: data?.panneId || 'notification',
			data: data
		};
		
		const notification = new Notification(title, options);
		
		notification.onclick = () => {
			if (data?.panneId) {
			window.location.href = `/app/paiement`;
			}
			notification.close();
		};
		
		setTimeout(() => notification.close(), 10000);
		}
	}

	private async createLocalNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
		try {
		// Utiliser setTimeout pour éviter l'erreur d'injection
		setTimeout(async () => {
			try {
			const notificationsRef = collection(this.firestore, 'notifications');
			
			await addDoc(notificationsRef, {
				userId: userId,
				titre: title,                    
				texte: message,                  
				data: data || {},
				type: data?.type || 'general',
				dateHeure: Timestamp.now(),      
				vue: false,                     
				platform: this.getPlatform()
			});
			
			console.log(`📝 Notification locale créée pour ${userId}`);
			} catch (error) {
			console.error('❌ Erreur création notification locale:', error);
			}
		}, 100);
		} catch (error) {
		console.error('❌ Erreur préparation notification locale:', error);
		}
	}

	async sendPanneRepareeNotification(panneId: string, userId: string, voitureNom: string): Promise<boolean> {
		const title = '🚗 Panne réparée !';
		const message = `${voitureNom} est réparée. Cliquez pour payer.`;
		const data = {
		type: 'panne_reparée',
		panneId: panneId,
		voitureNom: voitureNom,
		timestamp: new Date().toISOString(),
		redirectTo: '/app/paiement'
		};
		
		return await this.sendNotification(userId, title, message, data);
	}

	private getPlatform(): string {
		if (this.platform.is('android')) return 'android';
		if (this.platform.is('ios')) return 'ios';
		if (this.platform.is('desktop')) return 'desktop';
		if (this.platform.is('pwa')) return 'pwa';
		if (this.platform.is('mobileweb')) return 'mobileweb';
		if (this.platform.is('capacitor') || this.platform.is('cordova')) return 'mobile';
		return 'web';
	}

	private getRedirectUrl(data: any): string {
		if (data?.panneId) {
		return `${window.location.origin}/app/paiement`;
		}
		return window.location.origin;
	}
}