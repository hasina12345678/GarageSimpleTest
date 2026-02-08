import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
	Firestore,
	collection,
	deleteDoc,
	doc,
	getDocs,
	limit,
	orderBy,
	query,
	updateDoc,
	where,
	writeBatch
} from '@angular/fire/firestore';

@Injectable({
	providedIn: 'root'
})
export class NotificationService {
	private auth = inject(Auth);
	private firestore = inject(Firestore);

	async getUserNotifications(userId: string): Promise<any[]> {
		try {
			const notificationsRef = collection(this.firestore, 'notifications');
			const q = query(
				notificationsRef,
				where('userId', '==', userId),
				orderBy('dateHeure', 'desc'),
				limit(50)
			);

			const snapshot = await getDocs(q);
			return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
		} catch (error) {
			console.error('❌ Erreur récupération notifications:', error);
			return [];
		}
	}

	async markNotificationAsRead(notificationId: string): Promise<void> {
		const ref = doc(this.firestore, 'notifications', notificationId);
		await updateDoc(ref, {
			vue: true,
			readAt: new Date()
		});
	}

	async markAllNotificationsAsRead(userId: string): Promise<void> {
		const notifications = await this.getUserNotifications(userId);
		const unread = notifications.filter(n => !n.vue);

		const batch = writeBatch(this.firestore);

		unread.forEach(n => {
			const ref = doc(this.firestore, 'notifications', n.id);
			batch.update(ref, { vue: true, readAt: new Date() });
		});

		await batch.commit();
	}

	async deleteNotification(notificationId: string): Promise<void> {
		const ref = doc(this.firestore, 'notifications', notificationId);
		await deleteDoc(ref);
	}

	async getUnreadCount(userId: string): Promise<number> {
		const ref = collection(this.firestore, 'notifications');
		const q = query(ref, where('userId', '==', userId), where('vue', '==', false));
		const snapshot = await getDocs(q);
		return snapshot.size;
	}
}