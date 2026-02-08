export interface Voiture {
	id?: string;
	idUtilisateur: string;
	matricule: string;
	marque?: string;
	modele?: string;
	annee?: number;
	dateAjout?: Date;
}