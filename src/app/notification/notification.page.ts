import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonList, 
  IonItem, 
  IonItemSliding, 
  IonItemOptions, 
  IonItemOption,
  IonIcon,
  IonButton,
  IonBadge,
  IonSpinner,
  AlertController,
  ToastController,
  InfiniteScrollCustomEvent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  timeOutline,
  warningOutline,
  checkmarkOutline,
  checkmarkDoneOutline,
  trashOutline,
  carOutline,
  cardOutline,
  alertCircleOutline,
  notificationsOffOutline
} from 'ionicons/icons';
import { NotificationService } from '../services/notification.service';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.page.html',
  styleUrls: ['./notification.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    IonButton,
    IonBadge,
    IonSpinner
  ]
})
export class NotificationPage implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private auth = inject(Auth);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private router = inject(Router);

  notifications: any[] = [];
  unreadCount: number = 0;
  isLoading: boolean = true;
  errorMessage: string = '';
  userId: string = '';

  constructor() {
    addIcons({ 
      timeOutline,
      warningOutline,
      checkmarkOutline,
      checkmarkDoneOutline,
      trashOutline,
      carOutline,
      cardOutline,
      alertCircleOutline,
      notificationsOffOutline
    });
  }

  async ngOnInit() {
    await this.initializeUser();
  }

  ngOnDestroy() {
    // Nettoyage si nécessaire
  }

  async initializeUser() {
    const user = this.auth.currentUser;
    if (!user) {
      this.errorMessage = 'Veuillez vous connecter pour voir vos notifications';
      this.isLoading = false;
      return;
    }
    
    this.userId = user.uid;
    await this.loadNotifications();
  }

  async loadNotifications() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      // Utilise le service pour charger les notifications
      // Note: Tu dois implémenter getNotifications() dans ton service
      this.notifications = await this.notificationService.getUserNotifications(this.userId);
      this.calculateUnreadCount();
      
      if (this.notifications.length === 0) {
        this.errorMessage = 'Aucune notification trouvée';
      }
      
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      this.errorMessage = 'Erreur de chargement des notifications';
      this.notifications = [];
    } finally {
      this.isLoading = false;
    }
  }

  async loadMore(event?: InfiniteScrollCustomEvent) {
    // Implémentation du scroll infini si nécessaire
    if (event) {
      event.target.complete();
    }
  }

  calculateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.vue).length;
  }

  async openNotification(notification: any) {
    // Marquer comme lu si pas déjà lu
    if (!notification.vue) {
      await this.markAsRead(notification.id);
    }
    
    // Rediriger selon le type de notification
    if (notification.data?.panneId) {
      this.router.navigate(['/app/paiement'], { 
        queryParams: { panneId: notification.data.panneId } 
      });
    } else if (notification.data?.redirectTo) {
      this.router.navigate([notification.data.redirectTo]);
    }
  }

  async markAsRead(notificationId: string) {
    try {
      await this.notificationService.markNotificationAsRead(notificationId);
      
      // Mettre à jour localement
      const index = this.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        this.notifications[index].vue = true;
        this.calculateUnreadCount();
      }
      
      await this.showToast('Notification marquée comme lue', 'success');
    } catch (error) {
      console.error('Erreur marquer comme lu:', error);
      await this.showToast('Erreur lors de la mise à jour', 'danger');
    }
  }

  async markAllAsRead() {
    if (this.unreadCount === 0) return;
    
    const alert = await this.alertController.create({
      header: 'Marquer tout comme lu',
      message: `Marquer ${this.unreadCount} notification${this.unreadCount > 1 ? 's' : ''} comme lue${this.unreadCount > 1 ? 's' : ''} ?`,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Marquer',
          handler: async () => {
            try {
              await this.notificationService.markAllNotificationsAsRead(this.userId);
              
              this.notifications.forEach(n => n.vue = true);
              this.unreadCount = 0;
              
              await this.showToast('Toutes les notifications marquées comme lues', 'success');
            } catch (error) {
              console.error('Erreur marquer tout comme lu:', error);
              await this.showToast('Erreur lors de la mise à jour', 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async deleteNotification(notificationId: string) {
    const alert = await this.alertController.create({
      header: 'Supprimer',
      message: 'Voulez-vous vraiment supprimer cette notification ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          handler: async () => {
            try {
              await this.notificationService.deleteNotification(notificationId);
              
              // Supprimer localement
              this.notifications = this.notifications.filter(n => n.id !== notificationId);
              this.calculateUnreadCount();
              
              await this.showToast('Notification supprimée', 'success');
            } catch (error) {
              console.error('Erreur suppression:', error);
              await this.showToast('Erreur lors de la suppression', 'danger');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  getNotificationIcon(type: string): string {
    const icons: {[key: string]: string} = {
      'nouvelle_panne': 'alert-circle-outline',
      'panne_reparée': 'car-outline',
      'paiement_reçu': 'card-outline',
      'paiement_complet': 'checkmark-circle-outline',
      'paiement_partiel': 'card-outline',
      'rappel_paiement': 'time-outline',
      'statut_modifié': 'sync-outline',
      'système': 'settings-outline',
      'autre': 'information-circle-outline'
    };
    
    return icons[type] || 'information-circle-outline';
  }

  getNotificationTypeClass(type: string): string {
    const classes: {[key: string]: string} = {
      'nouvelle_panne': 'type-warning',
      'panne_reparée': 'type-success',
      'paiement_reçu': 'type-info',
      'paiement_complet': 'type-success',
      'paiement_partiel': 'type-warning',
      'rappel_paiement': 'type-danger',
      'statut_modifié': 'type-info',
      'système': 'type-system',
      'autre': 'type-default'
    };
    
    return classes[type] || 'type-default';
  }

  getNotificationTypeLabel(type: string): string {
    const labels: {[key: string]: string} = {
      'nouvelle_panne': 'Nouvelle panne',
      'panne_reparée': 'Panne réparée',
      'paiement_reçu': 'Paiement',
      'paiement_complet': 'Paiement complet',
      'paiement_partiel': 'Paiement partiel',
      'rappel_paiement': 'Rappel',
      'statut_modifié': 'Statut modifié',
      'système': 'Système',
      'autre': 'Notification'
    };
    
    return labels[type] || 'Notification';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    
    await toast.present();
  }
}