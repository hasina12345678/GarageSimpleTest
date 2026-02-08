import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle,
  IonCardContent,
  IonItem, 
  IonLabel, 
  IonSelect, 
  IonSelectOption,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
  IonChip,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  carOutline, 
  warningOutline,
  checkmarkCircleOutline,
  calendarOutline,
  cardOutline,
  timeOutline
} from 'ionicons/icons';
import { FirestoreService } from '../services/firestore.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-paiement',
  templateUrl: './paiement.page.html',
  styleUrls: ['./paiement.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon,
    IonChip
  ]
})
export class PaiementPage implements OnInit {
  paiementForm: FormGroup;
  userId: string = '';
  
  // Données
  pannesReparees: any[] = []; // Pannes avec statut 2
  panneSelectionnee: any = null;
  paiementsExistants: any[] = [];
  montantDejaPaye: number = 0;
  
  // États
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private auth: Auth,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ 
      carOutline, 
      warningOutline,
      checkmarkCircleOutline,
      calendarOutline,
      cardOutline,
      timeOutline
    });
    
    this.paiementForm = this.fb.group({
      idPanne: ['', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]]
    });
  }

  async ngOnInit() {
    await this.initializeUser();
  }

  async initializeUser() {
    const user = this.auth.currentUser;
    if (!user) {
      this.errorMessage = 'Vous devez être connecté pour accéder à cette page';
      this.isLoading = false;
      return;
    }
    
    this.userId = user.uid;
    await this.chargerDonnees();
  }

  async chargerDonnees() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Charger les pannes réparées non payées (statut 2)
      await this.chargerPannesReparees();
      
      if (this.pannesReparees.length === 0) {
        this.errorMessage = 'Aucune panne réparée en attente de paiement';
      }
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      this.errorMessage = 'Erreur de chargement des données. Veuillez réessayer.';
    } finally {
      this.isLoading = false;
    }
  }

  async chargerPannesReparees() {
    try {
      // Utiliser le service pour récupérer les pannes avec statut 2
      this.pannesReparees = await this.firestoreService.getPannesRepareesNonPayees();
      
      // Pour chaque panne, charger les détails et le total payé
      for (const panne of this.pannesReparees) {
        // Charger les paiements existants
        panne.paiements = await this.firestoreService.getPaiementsPourPanne(panne.id);
        panne.totalPaye = panne.paiements.reduce((total: number, p: any) => total + p.montant, 0);
      }
      
    } catch (error) {
      console.error('Erreur chargement pannes réparées:', error);
      throw error;
    }
  }

  async onPanneSelectionChange(event: any) {
    const panneId = event.detail.value;
    if (!panneId) {
      this.panneSelectionnee = null;
      this.montantDejaPaye = 0;
      return;
    }
    
    // Trouver la panne sélectionnée
    this.panneSelectionnee = this.pannesReparees.find(p => p.id === panneId);
    
    if (this.panneSelectionnee) {
      // Charger les paiements existants pour cette panne
      this.paiementsExistants = await this.firestoreService.getPaiementsPourPanne(panneId);
      this.montantDejaPaye = this.paiementsExistants.reduce((total, p) => total + p.montant, 0);
      
      // Mettre à jour la validation du montant
      const maxMontant = this.panneSelectionnee.totalPrix - this.montantDejaPaye;
      this.paiementForm.get('montant')?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(maxMontant)
      ]);
      this.paiementForm.get('montant')?.updateValueAndValidity();
    }
  }

  setMontant(montant: number) {
    this.paiementForm.patchValue({ montant });
  }

  getQuickAmountOptions(): number[] {
    if (!this.panneSelectionnee) return [];
    
    const resteAPayer = this.panneSelectionnee.totalPrix - this.montantDejaPaye;
    const options: number[] = [];
    
    // Proposer des montants basés sur le reste à payer
    if (resteAPayer >= 100000) {
      options.push(50000, 100000);
    } else if (resteAPayer >= 50000) {
      options.push(20000, 50000);
    } else if (resteAPayer >= 20000) {
      options.push(10000, 20000);
    } else if (resteAPayer >= 10000) {
      options.push(5000, 10000);
    } else {
      options.push(1000, 5000);
    }
    
    // Filtrer les options supérieures au reste à payer
    return options.filter(option => option <= resteAPayer);
  }

  async soumettrePaiement() {
    if (this.paiementForm.invalid) {
      await this.presentToast('Veuillez remplir tous les champs correctement', 'warning');
      return;
    }

    const formData = this.paiementForm.value;
    const montant = Number(formData.montant);
    const resteAPayer = this.panneSelectionnee.totalPrix - this.montantDejaPaye;
    
    // Confirmation pour paiement partiel
    if (montant < resteAPayer) {
      const confirmed = await this.presentConfirmationAlert('paiement partiel', montant, resteAPayer);
      if (!confirmed) return;
    }

    this.isSubmitting = true;

    try {
      // Effectuer le paiement
      const result = await this.firestoreService.effectuerPaiement({
        idPanne: formData.idPanne,
        montant: montant
      });

      // Réinitialiser le formulaire
      this.paiementForm.reset({
        idPanne: '',
        montant: ''
      });
      
      this.panneSelectionnee = null;
      this.montantDejaPaye = 0;
      this.paiementsExistants = [];

      // Recharger les données
      await this.chargerPannesReparees();

      // Message de succès
      const message = montant >= resteAPayer 
        ? 'Paiement complet effectué avec succès ! La panne est maintenant marquée comme payée.'
        : `Paiement partiel de ${montant} Ar effectué avec succès ! Reste à payer: ${resteAPayer - montant} Ar`;
      
      await this.presentToast(message, 'success');

    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      await this.presentToast('Erreur lors du paiement. Veuillez réessayer.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  async presentConfirmationAlert(type: string, montant: number, total: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Paiement partiel',
        message: `Vous allez payer ${montant} Ar sur un total de ${total} Ar. 
                 Le reste (${total - montant} Ar) devra être payé ultérieurement. 
                 Voulez-vous continuer ?`,
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Payer',
            handler: () => resolve(true)
          }
        ]
      });

      await alert.present();
    });
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      color: color,
      position: 'top'
    });
    
    await toast.present();
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp?.toDate) {
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
}