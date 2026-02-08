import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./home/home.page').then(m => m.HomePage),
	},
	{
		path: 'app',
		loadComponent: () => import('./layouts/main/main.component').then(m => m.MainLayoutComponent),
		children: [
			{
				path: 'accueil',
				loadComponent: () => import('./accueil/accueil.page').then(m => m.AccueilPage)
			},
			{
				path: 'probleme',
				loadComponent: () => import('./probleme/probleme.page').then(m => m.ProblemePage)
			},
			{
				path: 'voiture',
				loadComponent: () => import('./voiture/voiture.page').then(m => m.VoiturePage)
			},
			{
				path: 'paiement',
				loadComponent: () => import('./paiement/paiement.page').then(m => m.PaiementPage)
			},
			{
				path: 'notification',
				loadComponent: () => import('./notification/notification.page').then(m => m.NotificationPage)
			},
			{
				path: '',
				redirectTo: 'accueil',
				pathMatch: 'full'
			}
		]
	},
	{
		path: '',
		redirectTo: 'login',
		pathMatch: 'full',
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];