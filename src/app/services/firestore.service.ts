import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
	Firestore,
	Timestamp,
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	runTransaction,
	where,
	writeBatch
} from '@angular/fire/firestore';


@Injectable({
	providedIn: 'root'
})
export class FirestoreService {
	constructor(
		private firestore: Firestore,
		private auth: Auth,
		private http: HttpClient,
	) { }

	// === Méthodes existantes ===
	async viderCollection(collectionName: string): Promise<void> {
		try {
			const ref = collection(this.firestore, collectionName);
			const querySnapshot = await getDocs(ref);

			const deletePromises = querySnapshot.docs.map(doc =>
				deleteDoc(doc.ref)
			);

			await Promise.all(deletePromises);
			console.log(`✅ Collection "${collectionName}" vidée (${querySnapshot.size} documents supprimés)`);
		} catch (error) {
			console.error(`❌ Erreur vidage collection "${collectionName}":`, error);
		}
	}

	async ajouterPanneType(data: any): Promise<any> {
		return this.ajouterDocument('panneTypes', data);
	}

	async ajouterStatutForPanne(data: { statut: string, dateHeure?: Date }): Promise<any> {
		return this.ajouterDocument('statutForPannes', {
			statut: data.statut,
			dateHeure: data.dateHeure || new Date()
		});
	}

	// Supprimer ajouterStatutForPaiement si non utilisé
	// async ajouterStatutForPaiement(data: { statut: string, dateHeure?: Date }): Promise<any> {
	//   return this.ajouterDocument('statutForPaiements', {
	//     statut: data.statut,
	//     dateHeure: data.dateHeure || new Date()
	//   });
	// }

	async ajouterDocument(collectionName: string, data: any): Promise<any> {
		try {
			const ref = collection(this.firestore, collectionName);
			return await addDoc(ref, {
				...data,
				dateCreation: new Date()
			});
		} catch (error) {
			console.error(`❌ Erreur ajout document "${collectionName}":`, error);
			throw error;
		}
	}

	// Ajoute cette méthode dans FirestoreService
	async ajouterDocumentAvecId(collectionName: string, id: string, data: any): Promise<any> {
		try {
			const ref = doc(this.firestore, collectionName, id);
			await runTransaction(this.firestore, async (transaction) => {
				transaction.set(ref, {
					...data,
					dateCreation: new Date()
				});
			});

			console.log(`✅ Document "${collectionName}/${id}" créé`);
			return { id, ...data };
		} catch (error) {
			console.error(`❌ Erreur création document "${collectionName}/${id}":`, error);
			throw error;
		}
	}

	// === MÉTHODES POUR LA PAGE PROBLÈME ===

	// Récupérer les voitures de l'utilisateur connecté
	async getVoituresUtilisateur(): Promise<any[]> {
		const user = this.auth.currentUser;
		if (!user) return [];

		try {
			const voituresRef = collection(this.firestore, 'voitures');
			const q = query(voituresRef, where('idUtilisateur', '==', user.uid));
			const querySnapshot = await getDocs(q);

			return querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('❌ Erreur récupération voitures:', error);
			throw error;
		}
	}

	// Récupérer tous les types de panne
	async getPanneTypes(): Promise<any[]> {
		try {
			const panneTypesRef = collection(this.firestore, 'panneTypes');
			const querySnapshot = await getDocs(panneTypesRef);

			return querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('❌ Erreur récupération panne types:', error);
			throw error;
		}
	}

	// Récupérer le statut "non réparé" (ID = 1) - SIMPLIFIÉ
	async getStatutNonRepare(): Promise<string> {
		try {
			// Vérifier si le statut ID = 1 existe
			const statutRef = doc(this.firestore, 'statutForPannes', '1');
			const statutSnapshot = await getDoc(statutRef);

			if (statutSnapshot.exists()) {
				return '1'; // Retourner l'ID "1"
			}

			// Si le statut n'existe pas, le créer avec ID = 1
			await this.creerStatutAvecId('1', {
				statut: 'non réparé',
				dateHeure: new Date()
			});

			return '1';
		} catch (error) {
			console.error('❌ Erreur récupération statut non réparé:', error);
			throw error;
		}
	}

	// Méthode pour créer un statut avec un ID spécifique
	private async creerStatutAvecId(id: string, data: { statut: string, dateHeure?: Date }): Promise<void> {
		try {
			const statutRef = doc(this.firestore, 'statutForPannes', id);
			await runTransaction(this.firestore, async (transaction) => {
				transaction.set(statutRef, {
					statut: data.statut,
					dateHeure: data.dateHeure || new Date(),
					dateCreation: new Date()
				});
			});

			console.log(`✅ Statut créé avec ID: ${id} (${data.statut})`);
		} catch (error) {
			console.error(`❌ Erreur création statut ID ${id}:`, error);
			throw error;
		}
	}

	// Créer une panne complète - UTILISE STATUT ID = 1
	async creerPanneComplet(data: {
		idVoiture: string;
		panneTypesIds: string[];
	}): Promise<{ panneId: string }> {
		const batch = writeBatch(this.firestore);

		try {
			// 1. Créer la panne principale
			const panneRef = doc(collection(this.firestore, 'pannes'));
			batch.set(panneRef, {
				idVoiture: data.idVoiture,
				dateHeure: Timestamp.fromDate(new Date())
			});

			const panneId = panneRef.id;

			// 2. Créer les détails de panne (plusieurs types)
			for (const panneTypeId of data.panneTypesIds) {
				const panneDetailsRef = doc(collection(this.firestore, 'panneDetails'));
				batch.set(panneDetailsRef, {
					idPanne: panneId,
					idPanneType: panneTypeId
				});
			}

			// 3. Utiliser le statut ID = 1 (non réparé)
			const statutId = await this.getStatutNonRepare(); // Retourne toujours "1"

			// 4. Ajouter l'entrée dans panneStatuts
			const panneStatutRef = doc(collection(this.firestore, 'panneStatuts'));
			batch.set(panneStatutRef, {
				idPanne: panneId,
				idStatutForPanne: statutId, // Toujours "1" pour non réparé
				dateHeure: Timestamp.fromDate(new Date())
			});

			// 5. Exécuter le batch
			await batch.commit();

			console.log('✅ Panne créée avec succès:', panneId, 'Statut: non réparé (ID: 1)');
			return { panneId };

		} catch (error) {
			console.error('❌ Erreur création panne complète:', error);
			throw error;
		}
	}

	// Vérifier si une panne existe déjà pour une voiture
	async panneExistePourVoiture(idVoiture: string): Promise<boolean> {
		try {
			const pannesRef = collection(this.firestore, 'pannes');
			const q = query(pannesRef, where('idVoiture', '==', idVoiture));
			const querySnapshot = await getDocs(q);

			return !querySnapshot.empty;
		} catch (error) {
			console.error('❌ Erreur vérification panne:', error);
			return false;
		}
	}

	// Récupérer le statut actuel d'une panne
	async getStatutPanne(panneId: string): Promise<any> {
		try {
			const panneStatutsRef = collection(this.firestore, 'panneStatuts');
			const q = query(
				panneStatutsRef,
				where('idPanne', '==', panneId),
				orderBy('dateHeure', 'desc')
			);
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				const latestStatut = querySnapshot.docs[0].data();

				// Récupérer les détails du statut
				const statutDetails = await this.getStatutDetails(latestStatut['idStatutForPanne']);

				return {
					...latestStatut,
					statutDetails
				};
			}

			return null;
		} catch (error) {
			console.error('❌ Erreur récupération statut panne:', error);
			throw error;
		}
	}

	// Récupérer les détails d'un statut
	async getStatutDetails(statutId: string): Promise<any> {
		try {
			const statutRef = doc(this.firestore, 'statutForPannes', statutId);
			const statutSnapshot = await getDoc(statutRef);

			if (statutSnapshot.exists()) {
				return {
					id: statutSnapshot.id,
					...statutSnapshot.data()
				};
			}

			return null;
		} catch (error) {
			console.error('❌ Erreur récupération détails statut:', error);
			throw error;
		}
	}

	// Changer le statut d'une panne (optionnel pour l'admin)
	async changerStatutPanne(panneId: string, statutId: string): Promise<void> {
		const batch = writeBatch(this.firestore);

		try {
			// Vérifier que le statut existe
			const statutExiste = await this.verifierStatutExiste(statutId);

			if (!statutExiste) {
				throw new Error(`Le statut ID ${statutId} n'existe pas`);
			}

			// Ajouter la nouvelle entrée dans panneStatuts
			const panneStatutRef = doc(collection(this.firestore, 'panneStatuts'));
			batch.set(panneStatutRef, {
				idPanne: panneId,
				idStatutForPanne: statutId, // ID du statut (1, 2 ou 3)
				dateHeure: Timestamp.fromDate(new Date())
			});

			// Exécuter le batch
			await batch.commit();

			console.log(`✅ Statut de la panne ${panneId} changé en ID: ${statutId}`);

		} catch (error) {
			console.error('❌ Erreur changement statut panne:', error);
			throw error;
		}
	}

	// Vérifier si un statut existe
	private async verifierStatutExiste(statutId: string): Promise<boolean> {
		try {
			const statutRef = doc(this.firestore, 'statutForPannes', statutId);
			const statutSnapshot = await getDoc(statutRef);
			return statutSnapshot.exists();
		} catch (error) {
			return false;
		}
	}

	// Récupérer tous les statuts disponibles
	async getTousStatuts(): Promise<any[]> {
		try {
			const statutsRef = collection(this.firestore, 'statutForPannes');
			const querySnapshot = await getDocs(statutsRef);

			return querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('❌ Erreur récupération statuts:', error);
			throw error;
		}
	}

	// Initialiser les statuts par défaut (à apporter une fois)
	async initialiserStatutsParDefaut(): Promise<void> {
		try {
			const statuts = [
				{ id: '1', statut: 'non réparé' },
				{ id: '2', statut: 'réparé et non payé' },
				{ id: '3', statut: 'payé' }
			];

			for (const statut of statuts) {
				const statutRef = doc(this.firestore, 'statutForPannes', statut.id);
				const statutSnapshot = await getDoc(statutRef);

				if (!statutSnapshot.exists()) {
					await this.creerStatutAvecId(statut.id, {
						statut: statut.statut,
						dateHeure: new Date()
					});
				}
			}

			console.log('✅ Statuts par défaut initialisés');
		} catch (error) {
			console.error('❌ Erreur initialisation statuts:', error);
			throw error;
		}
	}



	// PAIEMENTS

	// Ajoute ces méthodes dans FirestoreService

	// Récupérer les pannes réparées non payées (statut ID = 2)
	async getPannesRepareesNonPayees(): Promise<any[]> {
		try {
			const user = this.auth.currentUser;
			if (!user) return [];

			// 1. Récupérer les voitures de l'utilisateur
			const voituresRef = collection(this.firestore, 'voitures');
			const voituresQuery = query(voituresRef, where('idUtilisateur', '==', user.uid));
			const voituresSnapshot = await getDocs(voituresQuery);

			const voitureIds = voituresSnapshot.docs.map(doc => doc.id);
			if (voitureIds.length === 0) return [];

			// 2. Récupérer TOUTES les pannes et filtrer côté client
			const pannesRef = collection(this.firestore, 'pannes');
			const pannesSnapshot = await getDocs(pannesRef);

			const pannes = pannesSnapshot.docs
				.map(doc => ({
					id: doc.id,
					...doc.data()
				} as any))
				// Filtrer pour garder seulement les pannes de l'utilisateur
				.filter(panne => voitureIds.includes(panne.idVoiture));

			// 3. Pour chaque panne, vérifier le statut
			const pannesFiltrees = [];

			for (const panne of pannes) {
				try {
					// Récupérer le statut actuel de la panne
					const currentStatut = await this.getStatutPanne(panne.id);

					if (currentStatut?.statutDetails?.id === '2') {
						// Charger les détails de la panne
						const panneDetails = await this.getPanneDetailsComplets(panne.id);

						// Charger la voiture
						const voitureDoc = await getDoc(doc(this.firestore, 'voitures', panne.idVoiture));
						const voiture = voitureDoc.exists()
							? { id: voitureDoc.id, ...voitureDoc.data() }
							: null;

						// Calculer le prix total
						const totalPrix = panneDetails.reduce((total: number, detail: any) =>
							total + (detail.panneType?.prix || 0), 0);

						pannesFiltrees.push({
							...panne,
							voiture,
							details: panneDetails,
							statut: currentStatut,
							totalPrix
						});
					}
				} catch (error) {
					console.error(`❌ Erreur traitement panne ${panne.id}:`, error);
				}
			}

			return pannesFiltrees;

		} catch (error) {
			console.error('❌ Erreur récupération pannes réparées:', error);
			throw error;
		}
	}

	// Récupérer les détails complets d'une panne
	private async getPanneDetailsComplets(panneId: string): Promise<any[]> {
		try {
			const panneDetailsRef = collection(this.firestore, 'panneDetails');
			const q = query(panneDetailsRef, where('idPanne', '==', panneId));
			const querySnapshot = await getDocs(q);

			const details = querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));

			// Charger les types de panne pour chaque détail
			const detailsComplets = await Promise.all(
				details.map(async (detail: any) => {
					const panneTypeDoc = await getDoc(doc(this.firestore, 'panneTypes', detail.idPanneType));
					const panneType = panneTypeDoc.exists()
						? { id: panneTypeDoc.id, ...panneTypeDoc.data() }
						: null;

					return { ...detail, panneType };
				})
			);

			return detailsComplets;
		} catch (error) {
			console.error('❌ Erreur récupération détails panne:', error);
			return [];
		}
	}

	// Récupérer tous les paiements pour une panne
	async getPaiementsPourPanne(panneId: string): Promise<any[]> {
		try {
			const paiementsRef = collection(this.firestore, 'paiements');
			const q = query(paiementsRef, where('idPanne', '==', panneId));
			const querySnapshot = await getDocs(q);

			return querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		} catch (error) {
			console.error('❌ Erreur récupération paiements:', error);
			return [];
		}
	}

	// Effectuer un paiement (méthode principale)
	async effectuerPaiement(data: { idPanne: string; montant: number }): Promise<{ paiementId: string; statutMisAJour: boolean }> {
		const batch = writeBatch(this.firestore);

		try {
			// 1. Créer le paiement
			const paiementRef = doc(collection(this.firestore, 'paiements'));
			const paiementData = {
				idPanne: data.idPanne,
				montant: data.montant,
				dateHeure: Timestamp.fromDate(new Date())
			};
			batch.set(paiementRef, paiementData);

			const paiementId = paiementRef.id;

			// 2. Calculer le total payé pour cette panne
			const paiementsExistants = await this.getPaiementsPourPanne(data.idPanne);
			const totalPaye = paiementsExistants.reduce((total, p) => total + p.montant, 0) + data.montant;

			// 3. Récupérer le coût total de la panne
			const panneDetails = await this.getPanneDetailsComplets(data.idPanne);
			const totalPrix = panneDetails.reduce((total: number, detail: any) =>
				total + (detail.panneType?.prix || 0), 0);

			// 4. Déterminer le statut du paiement
			let statutPaiementId: string;
			let statutPanneId: string = '2'; // Par défaut reste en "réparé et non payé"
			let statutMisAJour = false;

			if (totalPaye >= totalPrix) {
				// Paiement complet
				statutPaiementId = '3'; // "payé"
				statutPanneId = '3'; // Changer le statut de la panne à "payé"
				statutMisAJour = true;
			} else if (totalPaye > 0) {
				// Paiement partiel
				statutPaiementId = '2'; // "payé partiel"
			} else {
				statutPaiementId = '1'; // "non payé" (ne devrait pas arriver)
			}

			// 5. Ajouter le statut du paiement
			const paiementStatutRef = doc(collection(this.firestore, 'paiementStatuts'));
			batch.set(paiementStatutRef, {
				idPanne: data.idPanne, // Note: J'utilise idPanne au lieu de idPaiement
				idStatutForPaiement: statutPaiementId,
				dateHeure: Timestamp.fromDate(new Date())
			});

			// 6. Si paiement complet, changer le statut de la panne
			if (statutMisAJour) {
				const panneStatutRef = doc(collection(this.firestore, 'panneStatuts'));
				batch.set(panneStatutRef, {
					idPanne: data.idPanne,
					idStatutForPanne: statutPanneId, // "3" pour payé
					dateHeure: Timestamp.fromDate(new Date())
				});
			}

			// 7. Exécuter le batch
			await batch.commit();

			console.log(`✅ Paiement effectué: ${data.montant} Ar pour panne ${data.idPanne}`);
			console.log(`   Total payé: ${totalPaye}/${totalPrix} Ar`);
			console.log(`   Statut panne: ${statutMisAJour ? 'Payé (ID: 3)' : 'Réparé non payé (ID: 2)'}`);

			return { paiementId, statutMisAJour };

		} catch (error) {
			console.error('❌ Erreur lors du paiement:', error);
			throw error;
		}
	}

}