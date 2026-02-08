export interface StatutForPaiement {
	id?: string;
	statut: string; // ex: 'en attente', 'paye partiel', 'paye complet', 'annule'
	dateHeure?: Date;
}