import { Firestore, Timestamp, addDoc, collection, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { OneSignalService } from './onesignal.service';
import { Auth } from '@angular/fire/auth';
import { Injectable, inject, NgZone } from '@angular/core'; 

@Injectable({
  providedIn: 'root'
})
export class PanneMonitorService {
	private firestore = inject(Firestore);
	private oneSignalService = inject(OneSignalService);
	private auth = inject(Auth);
	private ngZone = inject(NgZone); 

	private isMonitoring = false;
	private unsubscribeListener: (() => void) | null = null;

	startMonitoring() {
		if (this.isMonitoring) {
		console.log('ℹ️ Surveillance déjà active');
		return;
		}

		const user = this.auth.currentUser;
		if (!user) {
		console.error('❌ Aucun utilisateur connecté pour la surveillance');
		return;
		}

		try {
		console.log(`🔍 Démarrage surveillance pour utilisateur: ${user.uid}`);

		const panneStatutsRef = collection(this.firestore, 'panneStatuts');

		// AJOUTER NgZone.run POUR L'APPEL INITIAL
		this.ngZone.run(() => {
			this.unsubscribeListener = onSnapshot(
			panneStatutsRef,
			(snapshot) => {
				this.ngZone.run(() => {
				this.handleSnapshot(snapshot);
				});
			},
			(error) => {
				this.ngZone.run(() => {
				console.error('❌ Erreur listener Firestore:', error);
				this.isMonitoring = false;
				setTimeout(() => {
					this.startMonitoring();
				}, 5000);
				});
			}
			);

			this.isMonitoring = true;
			console.log('✅ Surveillance démarrée avec succès');
		});
		
		} catch (error) {
		console.error('❌ Erreur initialisation surveillance:', error);
		}
	}

	private async handleSnapshot(snapshot: any): Promise<void> {
		try {
		for (const change of snapshot.docChanges()) {
			if (change.type === 'added') {
			const newStatut = change.doc.data();
			const statutId = newStatut['idStatutForPanne'];
			const panneId = newStatut['idPanne'];

			console.log(`Nouveau statut détecté: Panne ${panneId}, Statut ${statutId}`);

			if (statutId === '2') {
				console.log(`🚨 PANNE RÉPARÉE DÉTECTÉE: ${panneId}`);
				
				// EXÉCUTER LE TRAITEMENT DANS NgZone
				this.ngZone.run(async () => {
				await this.processPanneReparee(panneId);
				});
			}
			}
		}
		} catch (error) {
		console.error('❌ Erreur snapshot Firestore:', error);
		}
	}

	stopMonitoring() {
		if (this.unsubscribeListener) {
		this.unsubscribeListener();
		this.unsubscribeListener = null;
		this.isMonitoring = false;
		console.log('🛑 Surveillance arrêtée');
		}
	}


	async processPanneReparee(panneId: string) {
		try {
		
		const panneDocRef = doc(this.firestore, 'pannes', panneId);
		const panneDocSnapshot = await getDoc(panneDocRef);

		if (!panneDocSnapshot.exists()) {
			console.error(`❌ Panne ${panneId} non trouvée`);
			return;
		}

		const panne = panneDocSnapshot.data();
		const voitureId = panne['idVoiture'];

		if (!voitureId) {
			console.error(`❌ ID voiture manquant pour panne ${panneId}`);
			return;
		}

		const voitureDocRef = doc(this.firestore, 'voitures', voitureId);
		const voitureDocSnapshot = await getDoc(voitureDocRef);

		if (!voitureDocSnapshot.exists()) {
			console.error(`❌ Voiture ${voitureId} non trouvée`);
			return;
		}

		const voiture = voitureDocSnapshot.data();
		const userId = voiture['idUtilisateur'];
		const marque = voiture['marque'] || '';
		const modele = voiture['modele'] || '';
		const voitureNom = `${marque} ${modele}`.trim() || 'Votre voiture';

		if (!userId) {
			console.error(`❌ ID utilisateur manquant pour voiture ${voitureId}`);
			return;
		}

		console.log(`👤 Utilisateur concerné: ${userId}, Voiture: ${voitureNom}`);

		const currentUser = this.auth.currentUser;
		if (!currentUser || currentUser.uid !== userId) {
			console.log(`ℹ️ Panne ${panneId} appartient à un autre utilisateur, ignorée`);
			return;
		}

		const success = await this.oneSignalService.sendPanneRepareeNotification(
			panneId,
			userId,
			voitureNom
		);

		if (success) {
			console.log(`✅ Notification envoyée pour panne ${panneId}`);
		} else {
			console.log(`⚠️ Échec envoi notification pour panne ${panneId}`);
		}

		} catch (error) {
		console.error('❌ Erreur traitement panne:', error);
		}
	}
	
}