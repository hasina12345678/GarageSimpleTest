export interface PaiementStatut {
	id?: string;
	idPanne: string; // Note: Correction de idPaiement à idPanne selon votre structure
	idStatutForPaiement: string;
	dateHeure?: Date;
}