import { Injectable, inject, NgZone } from '@angular/core'; // AJOUTER NgZone
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { OneSignalService } from './onesignal.service';
import { PanneMonitorService } from './panne-monitor.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private oneSignalService = inject(OneSignalService);
  private panneMonitor = inject(PanneMonitorService);
  private ngZone = inject(NgZone); // AJOUTER NgZone

  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      if (result.user) {
        // EXÉCUTER DANS NgZone POUR ÉVITER L'ERREUR
        this.ngZone.run(async () => {
          await this.oneSignalService.initAfterLogin(result.user.uid);
          this.panneMonitor.startMonitoring();
        });
        
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      this.ngZone.run(() => { // AJOUTER NgZone ICI AUSSI
        this.panneMonitor.stopMonitoring();
      });
      
      await signOut(this.auth);
      console.log('✅ Déconnexion réussie!');
    } catch (error: any) {
      console.error('❌ Erreur de déconnexion:', error.message);
    }
  }

  isLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }
}