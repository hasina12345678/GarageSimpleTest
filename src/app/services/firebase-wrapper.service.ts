import { Injectable, inject } from '@angular/core';
import { Firestore, getDoc, onSnapshot, doc, collection, query, where, orderBy, Unsubscribe } from '@angular/fire/firestore';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FirebaseWrapperService {
	private firestore = inject(Firestore);
	private platform = inject(Platform);
	private isFirebaseReady = false;

	constructor() {
		// Marquer Firebase comme prêt après un délai
		setTimeout(() => {
		this.isFirebaseReady = true;
		console.log('✅ FirebaseWrapper: Firebase est prêt');
		}, 100);
	}

	// Méthode sécurisée pour getDoc
	async safeGetDoc(docPath: string): Promise<any> {
		await this.waitForFirebase();
		try {
		const docRef = doc(this.firestore, docPath);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
		} catch (error) {
		console.error('❌ Erreur safeGetDoc:', error);
		return null;
		}
	}

	// Méthode sécurisée pour onSnapshot
	safeOnSnapshot(collectionPath: string, conditions: any[] = [], callback: (data: any[]) => void): () => void {
		let unsubscribe: Unsubscribe | null = null;
		
		setTimeout(async () => {
		try {
			await this.waitForFirebase();
			const collectionRef = collection(this.firestore, collectionPath);
			
			let q = query(collectionRef);
			conditions.forEach(condition => {
			if (condition.type === 'where') {
				q = query(q, where(condition.field, condition.op, condition.value));
			} else if (condition.type === 'orderBy') {
				q = query(q, orderBy(condition.field, condition.direction || 'asc'));
			}
			});

			unsubscribe = onSnapshot(q, (snapshot) => {
			const data = snapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
			callback(data);
			});
		} catch (error) {
			console.error('❌ Erreur safeOnSnapshot:', error);
		}
		}, 100);
		
		// Retourner une fonction de nettoyage
		return () => {
		if (unsubscribe && typeof unsubscribe === 'function') {
			unsubscribe();
		}
		};
	}

	// Attendre que Firebase soit prêt
	private async waitForFirebase(): Promise<void> {
		if (this.isFirebaseReady) return;
		
		return new Promise(resolve => {
		const checkInterval = setInterval(() => {
			if (this.isFirebaseReady) {
			clearInterval(checkInterval);
			resolve();
			}
		}, 50);
		});
	}

	// Méthode simplifiée pour récupérer un document par ID
	async getDocument(collectionName: string, documentId: string): Promise<any> {
		return this.safeGetDoc(`${collectionName}/${documentId}`);
	}
}