import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { FirestoreService } from '../services/firestore.service';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton
  ]
})
export class HomePage {
	email: string = '';
	password: string = '';
	errorMessage: string = '';

	constructor(
		private authService: AuthService,
		private router: Router,
		private firestoreService: FirestoreService
	) { 
		addIcons({
		'log-out-outline': logOutOutline
		});
	}

	async onLogin() {
		if (!this.email || !this.password) {
			this.errorMessage = 'Veuillez remplir tous les champs';
			return;
		}

		const success = await this.authService.login(this.email, this.password);

		if (success) {
			// Créer les données de test après la connexion
			//   await this.creerDonneesTest();
			// await this.viderToutesLesCollections();
			this.router.navigate(['/app']);
		} else {
			this.errorMessage = 'Email ou mot de passe incorrect';
		}
	}

	async creerDonneesTest() {
		try {
			console.log('🚀 Démarrage de la création des données...');

			console.log('🔧 Création des nouvelles données...');

			// 1. Créer les StatutForPanne avec IDs spécifiques
			const statutsPanne = [
				{ id: '1', statut: 'non réparé' },
				{ id: '2', statut: 'réparé et non payé' },
				{ id: '3', statut: 'payé' }
				// Tu peux ajouter d'autres statuts si besoin
				// { id: '4', statut: 'payé partiel' },
				// { id: '5', statut: 'terminé' }
			];

			for (const statut of statutsPanne) {
				try {
					// Utiliser la nouvelle méthode avec ID spécifique
					await this.firestoreService.ajouterDocumentAvecId('statutForPannes', statut.id, {
						statut: statut.statut,
						dateHeure: new Date()
					});
					console.log(`✅ StatutForPanne "${statut.statut}" créé avec ID: ${statut.id}`);
				} catch (e) {
					console.log(`❌ Erreur création StatutForPanne "${statut.statut}":`, e);
				}
			}

			// 2. Créer les StatutForPaiement avec IDs spécifiques
			const statutsPaiement = [
				{ id: '1', statut: 'non payé' },
				{ id: '2', statut: 'payé partiel' },
				{ id: '3', statut: 'payé' }
			];

			for (const statut of statutsPaiement) {
				try {
					await this.firestoreService.ajouterDocumentAvecId('statutForPaiements', statut.id, {
						statut: statut.statut,
						dateHeure: new Date()
					});
					console.log(`✅ StatutForPaiement "${statut.statut}" créé avec ID: ${statut.id}`);
				} catch (e) {
					console.log(`❌ Erreur création StatutForPaiement "${statut.statut}":`, e);
				}
			}

			// 3. Créer les PanneType (pas besoin d'ID spécifique ici)
			const panneTypes = [
				{ nom: 'Frein', duree: 30, prix: 20000, description: 'Remplacement des plaquettes de frein' },
				{ nom: 'Vidange', duree: 2, prix: 5000, description: 'Vidange d\'huile moteur' },
				{ nom: 'Filtre', duree: 3, prix: 15000, description: 'Remplacement filtre à air/carburant' },
				{ nom: 'Batterie', duree: 1, prix: 30000, description: 'Remplacement batterie' },
				{ nom: 'Amortisseurs', duree: 40, prix: 80000, description: 'Remplacement amortisseurs' },
				{ nom: 'Embrayage', duree: 50, prix: 120000, description: 'Remplacement kit embrayage' },
				{ nom: 'Pneus', duree: 20, prix: 60000, description: 'Changement pneus et équilibrage' },
				{ nom: 'Système de refroidissement', duree: 25, prix: 45000, description: 'Vérification et réparation système refroidissement' }
			];

			for (const panneType of panneTypes) {
				try {
					await this.firestoreService.ajouterPanneType(panneType);
					console.log(`✅ PanneType "${panneType.nom}" créé`);
				} catch (e) {
					console.log(`❌ Erreur création PanneType "${panneType.nom}":`, e);
				}
			}

			// 4. Initialiser les statuts par défaut (au cas où)
			await this.firestoreService.initialiserStatutsParDefaut();

			console.log('🎉 Toutes les données ont été créées avec succès!');
			return true;

		} catch (error) {
			console.error('❌ Erreur lors de la création des données:', error);
			return false;
		}
	}

	async viderToutesLesCollections(): Promise<void> {
		try {
			// Liste des collections à vider
			const collections = [
				'statutForPannes',
				'statutForPaiements',
				'panneTypes',
				'utilisateurs',
				'voitures',
				'pannes',
				'panneDetails',
				'panneStatuts',
				'paiements',
				'paiementStatuts'
			];

			// Vider chaque collection
			for (const collectionName of collections) {
				try {
					await this.firestoreService.viderCollection(collectionName);
					console.log(`🗑️  Collection "${collectionName}" vidée`);
				} catch (e) {
					// Si la collection n'existe pas, c'est normal
					console.log(`ℹ️  Collection "${collectionName}" non trouvée ou déjà vide`);
				}
			}

			console.log('✅ Toutes les collections ont été vidées');
		} catch (error) {
			console.error('❌ Erreur lors du vidage des collections:', error);
			throw error;
		}
	}
}