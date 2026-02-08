import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, Timestamp, addDoc, collection, deleteDoc, doc, onSnapshot, query, where } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
	IonBadge,
	IonButton,
	IonCard,
	IonCardContent,
	IonCardHeader,
	IonCardTitle,
	IonContent,
	IonIcon,
	IonInput,
	IonItem,
	IonItemOption,
	IonItemOptions,
	IonItemSliding,
	IonLabel,
	IonList,
	IonNote,
	IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carOutline, trash } from 'ionicons/icons';
import { Voiture } from '../models/voiture.model';

@Component({
	selector: 'app-voiture',
	templateUrl: './voiture.page.html',
	styleUrls: ['./voiture.page.scss'],
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		IonContent,
		IonCard,
		IonCardHeader,
		IonCardTitle,
		IonCardContent,
		IonItem,
		IonLabel,
		IonInput,
		IonButton,
		IonSpinner,
		IonList,
		IonItemSliding,
		IonItemOptions,
		IonItemOption,
		IonIcon,
		IonNote,
		IonBadge
	]
})
export class VoiturePage implements OnInit, OnDestroy {
	voitureForm: FormGroup;
	voitures: Voiture[] = [];
	currentYear = new Date().getFullYear();
	isLoading = false;
	private userId: string = '';
	private voituresSubscription?: import('@firebase/firestore').Unsubscribe;

	constructor(
		private fb: FormBuilder,
		private firestore: Firestore,
		private auth: Auth
	) {
		addIcons({ carOutline, trash });

		this.voitureForm = this.fb.group({
			matricule: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\-]+$/)]],
			marque: [''],
			modele: [''],
			annee: [null, [Validators.min(1900), Validators.max(this.currentYear)]]
		});
	}

	ngOnInit() {
		this.getUserAndLoadVoitures();
	}

	ngOnDestroy() {
		if (this.voituresSubscription) {
			this.voituresSubscription();
		}
	}

	async getUserAndLoadVoitures() {
		const user = this.auth.currentUser;
		if (user) {
			this.userId = user.uid;
			this.loadVoitures();
		}
	}

	loadVoitures() {
		if (!this.userId) return;

		const voituresRef = collection(this.firestore, 'voitures');
		const q = query(voituresRef, where('idUtilisateur', '==', this.userId));

		// Écouter les changements en temps réel
		this.voituresSubscription = onSnapshot(q, (snapshot) => {
			this.voitures = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			} as Voiture));
		}, (error) => {
			console.error('Erreur lors du chargement des voitures :', error);
		});
	}

	async ajouterVoiture() {
		if (this.voitureForm.invalid || !this.userId) {
			return;
		}

		this.isLoading = true;

		try {
			const voitureData: Voiture = {
				idUtilisateur: this.userId,
				matricule: this.voitureForm.value.matricule.toUpperCase(),
				marque: this.voitureForm.value.marque || undefined,
				modele: this.voitureForm.value.modele || undefined,
				annee: this.voitureForm.value.annee || undefined,
				dateAjout: new Date()
			};

			const voituresRef = collection(this.firestore, 'voitures');
			await addDoc(voituresRef, voitureData);

			// Réinitialiser le formulaire
			this.voitureForm.reset();

			console.log('✅ Voiture ajoutée avec succès');
		} catch (error) {
			console.error('❌ Erreur lors de l\'ajout de la voiture :', error);
		} finally {
			this.isLoading = false;
		}
	}

	async supprimerVoiture(voitureId: string) {
		if (!confirm('Voulez-vous vraiment supprimer cette voiture ?')) {
			return;
		}

		try {
			const voitureRef = doc(this.firestore, 'voitures', voitureId);
			await deleteDoc(voitureRef);
			console.log('✅ Voiture supprimée');
		} catch (error) {
			console.error('❌ Erreur lors de la suppression de la voiture :', error);
		}
	}

	// Helper pour afficher les erreurs
	get matricule() {
		return this.voitureForm.get('matricule');
	}

	get annee() {
		return this.voitureForm.get('annee');
	}

	  // Méthode pour convertir Timestamp en Date
	convertTimestampToDate(timestamp: any): Date {
		if (timestamp instanceof Timestamp) {
		return timestamp.toDate();
		} else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
		return timestamp.toDate();
		} else if (timestamp?.seconds) {
		return new Date(timestamp.seconds * 1000);
		}
		return new Date(timestamp);
	}

	// Méthode utilitaire pour formater la date dans le template
	formatDate(date: any): string {
		if (!date) return 'Date inconnue';
		
		try {
		const dateObj = this.convertTimestampToDate(date);
		return dateObj.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
		} catch (error) {
		console.error('Erreur de formatage de date:', error);
		return 'Date invalide';
		}
	}
}