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
  IonButton,
  IonSpinner,
  IonIcon,
  IonSearchbar,
  IonCheckbox,
  IonChip,
  IonBadge,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  carOutline, 
  alertCircleOutline, 
  timeOutline, 
  checkmarkCircleOutline,
  warningOutline,
  informationCircleOutline,
  close
} from 'ionicons/icons';
import { FirestoreService } from '../services/firestore.service';

@Component({
  selector: 'app-probleme',
  templateUrl: './probleme.page.html',
  styleUrls: ['./probleme.page.scss'],
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
    IonButton,
    IonSpinner,
    IonIcon,
    IonSearchbar,
    IonCheckbox,
    IonChip,
    IonBadge
  ]
})
export class ProblemePage implements OnInit {
  problemeForm: FormGroup;
  voitures: any[] = [];
  panneTypes: any[] = [];
  panneTypesFiltres: any[] = [];
  voitureSelectionnee: any = null;
  panneExistante: boolean = false;
  
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ 
      carOutline, 
      alertCircleOutline, 
      timeOutline, 
      checkmarkCircleOutline,
      warningOutline,
      informationCircleOutline,
      close
    });
    
    this.problemeForm = this.fb.group({
      idVoiture: ['', Validators.required],
      panneTypesIds: [[]]
    });
  }

  async ngOnInit() {
    await this.chargerDonnees();
  }

  async chargerDonnees() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Charger voitures et types de panne en parallèle
      const [voituresData, panneTypesData] = await Promise.all([
        this.firestoreService.getVoituresUtilisateur(),
        this.firestoreService.getPanneTypes()
      ]);

      this.voitures = voituresData;
      this.panneTypes = panneTypesData;
      this.panneTypesFiltres = [...panneTypesData];

      if (this.voitures.length === 0) {
        this.errorMessage = 'Vous devez d\'abord ajouter une voiture pour signaler un problème.';
      }

      if (this.panneTypes.length === 0) {
        this.errorMessage = 'Aucun type de problème disponible pour le moment.';
      }

    } catch (error) {
      console.error('Erreur chargement données:', error);
      this.errorMessage = 'Erreur de chargement des données. Veuillez réessayer.';
    } finally {
      this.isLoading = false;
    }
  }

  async onVoitureChange(event: any) {
    const voitureId = event.detail.value;
    if (!voitureId) return;

    // Trouver la voiture sélectionnée
    this.voitureSelectionnee = this.voitures.find(v => v.id === voitureId);
    
    // Vérifier si une panne existe déjà
    if (voitureId) {
      this.panneExistante = await this.firestoreService.panneExistePourVoiture(voitureId);
    }
  }

  filtrerPannes(event: any) {
    const searchTerm = event.detail.value.toLowerCase();
    
    if (!searchTerm) {
      this.panneTypesFiltres = [...this.panneTypes];
      return;
    }

    this.panneTypesFiltres = this.panneTypes.filter(panneType => 
      panneType.nom.toLowerCase().includes(searchTerm) ||
      (panneType.description && panneType.description.toLowerCase().includes(searchTerm))
    );
  }

  toggleSelection(panneTypeId: string) {
    const currentSelection = this.problemeForm.get('panneTypesIds')?.value || [];
    const index = currentSelection.indexOf(panneTypeId);

    if (index > -1) {
      // Retirer de la sélection
      currentSelection.splice(index, 1);
    } else {
      // Ajouter à la sélection
      currentSelection.push(panneTypeId);
    }

    this.problemeForm.patchValue({
      panneTypesIds: currentSelection
    });
  }

  removeSelection(panneTypeId: string) {
    this.toggleSelection(panneTypeId);
  }

  estSelectionnee(panneTypeId: string): boolean {
    const currentSelection = this.problemeForm.get('panneTypesIds')?.value || [];
    return currentSelection.includes(panneTypeId);
  }

  getPanneTypeName(panneTypeId: string): string {
    const panneType = this.panneTypes.find(pt => pt.id === panneTypeId);
    return panneType ? panneType.nom : 'Inconnu';
  }

  getTotalPrix(): number {
    const selectedIds = this.problemeForm.get('panneTypesIds')?.value || [];
    return selectedIds.reduce((total: number, id: string) => {
      const panneType = this.panneTypes.find(pt => pt.id === id);
      return total + (panneType?.prix || 0);
    }, 0);
  }

  getTotalDuree(): number {
    const selectedIds = this.problemeForm.get('panneTypesIds')?.value || [];
    return selectedIds.reduce((total: number, id: string) => {
      const panneType = this.panneTypes.find(pt => pt.id === id);
      return total + (panneType?.duree || 0);
    }, 0);
  }

  async soumettreProbleme() {
    if (this.problemeForm.invalid) {
      await this.presentToast('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }

    if (this.problemeForm.get('panneTypesIds')?.value?.length === 0) {
      await this.presentToast('Veuillez sélectionner au moins un problème', 'warning');
      return;
    }

    if (this.panneExistante) {
      const confirmed = await this.presentConfirmationAlert();
      if (!confirmed) return;
    }

    this.isSubmitting = true;

    try {
      const formData = this.problemeForm.value;
      
      // Créer la panne complète (avec statut ID = 1)
      const result = await this.firestoreService.creerPanneComplet({
        idVoiture: formData.idVoiture,
        panneTypesIds: formData.panneTypesIds
      });

      // Réinitialiser le formulaire
      this.problemeForm.reset({
        idVoiture: '',
        panneTypesIds: []
      });
      this.voitureSelectionnee = null;
      this.panneExistante = false;

      await this.presentToast('Problème signalé avec succès ! (Statut: non réparé)', 'success');
        
    } catch (error) {
      console.error('Erreur soumission problème:', error);
      await this.presentToast('Erreur lors de la soumission. Veuillez réessayer.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  async presentConfirmationAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Attention',
        message: 'Une panne est déjà enregistrée pour cette voiture. Voulez-vous ajouter une nouvelle panne ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Continuer',
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
      duration: 3000,
      color: color,
      position: 'top'
    });
    
    await toast.present();
  }
}