export interface Notification {
	id?: string; // ID du document Firestore (optionnel car généré automatiquement)

	idUtilisateur: string; // ID de l'utilisateur destinataire de la notification
	idPanne: string; // ID de la panne concernée par la notification

	titre: string; // Titre de la notification
	texte: string; // Message détaillé de la notification

	type: NotificationType; // Type de notification pour le style et l'icon

	dateHeure: Date | any; // Timestamp Firestore ou Date JS
	vue: boolean; // Indique si l'utilisateur a vu la notification

	// Optionnel: données supplémentaires
	data?: any; // Données supplémentaires (pour le routage ou informations complémentaires)
}

// Types de notifications possibles
export enum NotificationType {
	NOUVELLE_PANNE = 'nouvelle_panne',
	PANNE_REPAREE = 'panne_reparée',
	PAIEMENT_RECU = 'paiement_reçu',
	PAIEMENT_PARTIEL = 'paiement_partiel',
	PAIEMENT_COMPLET = 'paiement_complet',
	RAPPEL_PAIEMENT = 'rappel_paiement',
	STATUT_MODIFIE = 'statut_modifié',
	SYSTEME = 'système',
	AUTRE = 'autre'
}

// Pour créer des notifications types
export const NotificationTemplates = {
	nouvellePanne: (voitureNom: string): NotificationTemplate => ({
		titre: 'Nouvelle panne signalée',
		texte: `Une nouvelle panne a été signalée pour votre ${voitureNom}`,
		type: NotificationType.NOUVELLE_PANNE
	}),

	panneReparee: (voitureNom: string): NotificationTemplate => ({
		titre: 'Panne réparée',
		texte: `La panne de votre ${voitureNom} a été réparée. Vous pouvez procéder au paiement.`,
		type: NotificationType.PANNE_REPAREE
	}),

	paiementRecu: (montant: number): NotificationTemplate => ({
		titre: 'Paiement reçu',
		texte: `Un paiement de ${montant} Ar a été enregistré pour votre panne.`,
		type: NotificationType.PAIEMENT_RECU
	}),

	paiementComplet: (): NotificationTemplate => ({
		titre: 'Paiement complet',
		texte: 'Votre panne est maintenant complètement payée. Merci!',
		type: NotificationType.PAIEMENT_COMPLET
	}),

	rappelPaiement: (jours: number): NotificationTemplate => ({
		titre: 'Rappel de paiement',
		texte: `Il vous reste ${jours} jour(s) pour effectuer le paiement de votre panne.`,
		type: NotificationType.RAPPEL_PAIEMENT
	})
};

// Interface pour les templates de notification
export interface NotificationTemplate {
	titre: string;
	texte: string;
	type: NotificationType;
}

// Fonction utilitaire pour créer une notification
export function createNotification(
	idUtilisateur: string,
	idPanne: string,
	template: NotificationTemplate,
	data?: any
): Partial<Notification> {
	return {
		idUtilisateur,
		idPanne,
		titre: template.titre,
		texte: template.texte,
		type: template.type,
		dateHeure: new Date(),
		vue: false,
		data
	};
}