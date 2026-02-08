export interface StatutForPanne {
	id?: string;
	statut: string; // ex: 'en attente', 'diagnostique', 'en réparation', 'termine', 'annule'
	dateHeure?: Date;
}