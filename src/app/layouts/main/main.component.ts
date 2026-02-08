import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IonApp, IonContent, IonHeader, IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonApp,
    RouterOutlet,
    IonButtons,
    IonButton,
    IonIcon
  ]
})
export class MainLayoutComponent {
  activeSegment: string = 'accueil';

  constructor(private router: Router, private authService: AuthService) {
    // Surveiller les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.updateActiveSegment(url);
    });
  }

  updateActiveSegment(url: string) {
    if (url.includes('/accueil') || url === '/app' || url === '/app/') {
      this.activeSegment = 'accueil';
    } else if (url.includes('/probleme')) {
      this.activeSegment = 'probleme';
    } else if (url.includes('/voiture')) {
      this.activeSegment = 'voiture';
    } else if (url.includes('/paiement')) {
      this.activeSegment = 'paiement';
    } else if (url.includes('/notification')) {
      this.activeSegment = 'notification';
    }
  }

  onSegmentChange(event: any) {
    const segment = event.detail.value;
    
    switch(segment) {
      case 'accueil':
        this.router.navigate(['/app/accueil']);
        break;
      case 'probleme':
        this.router.navigate(['/app/probleme']);
        break;
      case 'voiture':
        this.router.navigate(['/app/voiture']);
        break;
      case 'paiement':
        this.router.navigate(['/app/paiement']);
        break;
      case 'notification':
        this.router.navigate(['/app/notification']);
        break;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}