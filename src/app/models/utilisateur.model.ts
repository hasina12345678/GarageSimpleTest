export interface Utilisateur {
	id?: string;
	email: string;
	motDePasse?: string; // À utiliser avec Firebase Auth
	dateCreation?: Date;
}