import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonBadge, IonIcon, IonList, IonSpinner, IonChip, IonButton, Platform } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  carOutline, 
  alertCircleOutline, 
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  warningOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { Auth } from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
  doc,
  getDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-accueil',
  templateUrl: './accueil.page.html',
  styleUrls: ['./accueil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonList,
    IonSpinner,
    IonChip,
    IonButton
  ]
})
export class AccueilPage implements OnInit, OnDestroy {
  userId: string = '';
  isLoading = true;
  
  // Données
  pannesRecent: any[] = [];
  pannesFiltrees: any[] = []; // Nouveau tableau pour les pannes filtrées
  voitures: any[] = [];
  
  private subscriptions: any[] = [];
  private platform = inject(Platform); // Injection pour vérifier la plateforme

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    addIcons({ 
      carOutline, 
      alertCircleOutline, 
      checkmarkCircleOutline,
      timeOutline,
      calendarOutline,
      warningOutline,
      informationCircleOutline
    });
  }

  async ngOnInit() {
    // Attendre que la plateforme soit prête
    if (this.platform.is('hybrid')) {
      await this.platform.ready();
    }
    
    // Utiliser setTimeout pour garantir que l'injection est prête
    setTimeout(() => {
      this.initializeUser();
    }, 100);
  }

  ngOnDestroy() {
    // Nettoyer toutes les souscriptions
    this.subscriptions.forEach(unsubscribe => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.subscriptions = [];
  }

  initializeUser() {
    const user = this.auth.currentUser;
    if (user) {
      this.userId = user.uid;
      this.loadData();
    } else {
      this.isLoading = false;
    }
  }

  async loadData() {
    this.isLoading = true;
    
    try {
      // Charger les voitures de l'utilisateur
      await this.loadVoitures();
      
      // Charger les pannes
      await this.loadPannes();
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      this.isLoading = false;
    }
  }

  async loadVoitures(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        try {
          const voituresRef = collection(this.firestore, 'voitures');
          const q = query(voituresRef, where('idUtilisateur', '==', this.userId));
          
          const unsubscribe = onSnapshot(q, (snapshot) => {
            this.voitures = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            resolve();
          }, (error) => {
            console.error('Erreur chargement voitures:', error);
            resolve();
          });
          
          this.subscriptions.push(unsubscribe);
        } catch (error) {
          console.error('Erreur dans loadVoitures:', error);
          resolve();
        }
      }, 50);
    });
  }

  async loadPannes(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        if (!this.userId || this.voitures.length === 0) {
          this.isLoading = false;
          this.pannesFiltrees = [];
          resolve();
          return;
        }

        const voitureIds = this.voitures.map(v => v.id);
        
        // Vérifier que voitureIds n'est pas vide et ne dépasse pas 10 éléments (limite Firebase)
        if (voitureIds.length === 0 || voitureIds.length > 10) {
          this.isLoading = false;
          this.pannesFiltrees = [];
          resolve();
          return;
        }
        
        try {
          const pannesRef = collection(this.firestore, 'pannes');
          const q = query(
            pannesRef, 
            where('idVoiture', 'in', voitureIds.slice(0, 10)), // Limite à 10
            orderBy('dateHeure', 'desc')
          );
          
          const unsubscribe = onSnapshot(q, async (snapshot) => {
            const pannes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Pour chaque panne, charger les détails et statut
            await this.loadPannesDetails(pannes);
            
            // Filtrer les pannes après le chargement des détails
            this.filterPannes();
            
            this.isLoading = false;
            resolve();
          }, (error) => {
            console.error('Erreur chargement pannes:', error);
            this.isLoading = false;
            resolve();
          });
          
          this.subscriptions.push(unsubscribe);
        } catch (error) {
          console.error('Erreur dans loadPannes:', error);
          this.isLoading = false;
          resolve();
        }
      }, 100);
    });
  }

  // NOUVELLE MÉTHODE : Filtrer les pannes par statut
  filterPannes() {
    this.pannesFiltrees = this.pannesRecent.filter(panne => {
      const statutId = panne.statut?.statutInfo?.id;
      // Garder seulement les pannes avec statut 1 ou 2
      return statutId === '1' || statutId === '2';
    });
  }

  async loadPannesDetails(pannes: any[]): Promise<void> {
    this.pannesRecent = [];
    
    for (const panne of pannes) {
      try {
        // Charger les détails de la panne
        const panneDetails = await this.getPanneDetails(panne.id);
        
        // Charger le statut actuel
        const currentStatut = await this.getCurrentStatut(panne.id);
        
        // Vérifier si le statut existe
        if (!currentStatut) {
          console.log(`Panne ${panne.id} n'a pas de statut`);
          continue;
        }
        
        // Trouver la voiture associée
        const voiture = this.voitures.find(v => v.id === panne.idVoiture);
        
        const panneComplete = {
          ...panne,
          voiture,
          details: panneDetails,
          statut: currentStatut,
          totalPrix: this.calculatePannePrix(panneDetails),
          totalDuree: this.calculatePanneDuree(panneDetails)
        };
        
        this.pannesRecent.push(panneComplete);
        
      } catch (error) {
        console.error('Erreur détails panne:', error);
      }
    }
  }

  async getPanneDetails(panneId: string): Promise<any[]> {
    return new Promise((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        try {
          const detailsRef = collection(this.firestore, 'panneDetails');
          const q = query(detailsRef, where('idPanne', '==', panneId));
          
          const unsubscribe = onSnapshot(q, async (snapshot) => {
            const details = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Charger les types de panne pour chaque détail
            const detailsWithTypes = await Promise.all(
              details.map(async (detail: any) => {
                const type = await this.getPanneType(detail.idPanneType);
                return { ...detail, type };
              })
            );
            
            if (typeof unsubscribe === 'function') {
              unsubscribe();
            }
            resolve(detailsWithTypes);
          }, (error) => {
            console.error('Erreur getPanneDetails:', error);
            resolve([]);
          });
        } catch (error) {
          console.error('Erreur dans getPanneDetails:', error);
          resolve([]);
        }
      }, 50);
    });
  }

  async getPanneType(panneTypeId: string): Promise<any> {
    return new Promise((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        try {
          const typeRef = doc(this.firestore, 'panneTypes', panneTypeId);
          
          getDoc(typeRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
              const type = {
                id: docSnapshot.id,
                ...docSnapshot.data()
              };
              resolve(type);
            } else {
              resolve(null);
            }
          }).catch(error => {
            console.error('Erreur getPanneType:', error);
            resolve(null);
          });
        } catch (error) {
          console.error('Erreur dans getPanneType:', error);
          resolve(null);
        }
      }, 50);
    });
  }

  async getCurrentStatut(panneId: string): Promise<any> {
    return new Promise((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        try {
          const statutsRef = collection(this.firestore, 'panneStatuts');
          const q = query(
            statutsRef, 
            where('idPanne', '==', panneId),
            orderBy('dateHeure', 'desc')
          );
          
          const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
              const latestStatut = snapshot.docs[0].data();
              const statutInfo = await this.getStatutInfo(latestStatut['idStatutForPanne']);
              
              if (typeof unsubscribe === 'function') {
                unsubscribe();
              }
              resolve({
                ...latestStatut,
                statutInfo
              });
            } else {
              if (typeof unsubscribe === 'function') {
                unsubscribe();
              }
              resolve(null);
            }
          }, (error) => {
            console.error('Erreur getCurrentStatut:', error);
            resolve(null);
          });
        } catch (error) {
          console.error('Erreur dans getCurrentStatut:', error);
          resolve(null);
        }
      }, 50);
    });
  }

  async getStatutInfo(statutId: string): Promise<any> {
    return new Promise((resolve) => {
      // Utiliser setTimeout pour s'assurer que Firebase est prêt
      setTimeout(() => {
        try {
          const statutRef = doc(this.firestore, 'statutForPannes', statutId);
          
          getDoc(statutRef).then((docSnapshot) => {
            if (docSnapshot.exists()) {
              const statut = {
                id: docSnapshot.id,
                ...docSnapshot.data()
              };
              resolve(statut);
            } else {
              resolve(null);
            }
          }).catch(error => {
            console.error('Erreur getStatutInfo:', error);
            resolve(null);
          });
        } catch (error) {
          console.error('Erreur dans getStatutInfo:', error);
          resolve(null);
        }
      }, 50);
    });
  }

  calculatePannePrix(details: any[]): number {
    return details.reduce((total, detail) => {
      return total + (detail.type?.prix || 0);
    }, 0);
  }

  calculatePanneDuree(details: any[]): number {
    return details.reduce((total, detail) => {
      return total + (detail.type?.duree || 0);
    }, 0);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
      } else if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }

  // MODIFIÉ : Ajuster les couleurs pour les statuts 1, 2, 3
  getStatutColor(statutId: string, statutName: string): string {
    // Priorité à l'ID si disponible
    if (statutId === '1') return 'danger';      // Non réparé - Rouge
    if (statutId === '2') return 'warning';     // Réparé et non payé - Orange
    if (statutId === '3') return 'success';     // Payé - Vert
    
    // Fallback au nom si l'ID n'est pas disponible
    const statutLower = statutName?.toLowerCase() || '';
    
    if (statutLower.includes('non réparé') || statutLower.includes('non repare')) return 'danger';
    if (statutLower.includes('réparé et non payé') || statutLower.includes('repare et non paye')) return 'warning';
    if (statutLower.includes('payé') || statutLower.includes('paye')) return 'success';
    
    return 'medium';
  }

  getStatutIcon(statutId: string, statutName: string): string {
    // Priorité à l'ID si disponible
    if (statutId === '1') return 'alert-circle-outline';      // Non réparé
    if (statutId === '2') return 'time-outline';              // Réparé et non payé
    if (statutId === '3') return 'checkmark-circle-outline';  // Payé
    
    // Fallback au nom si l'ID n'est pas disponible
    const statutLower = statutName?.toLowerCase() || '';
    
    if (statutLower.includes('non réparé') || statutLower.includes('non repare')) return 'alert-circle-outline';
    if (statutLower.includes('réparé et non payé') || statutLower.includes('repare et non paye')) return 'time-outline';
    if (statutLower.includes('payé') || statutLower.includes('paye')) return 'checkmark-circle-outline';
    
    return 'information-circle-outline';
  }

  navigateToProbleme() {
    this.router.navigate(['/app/probleme']);
  }

  navigateToVoiture() {
    this.router.navigate(['/app/voiture']);
  }

  // NOUVELLE MÉTHODE : Afficher un message différent si pas de pannes filtrées
  hasFilteredPannes(): boolean {
    return this.pannesFiltrees.length > 0;
  }
}