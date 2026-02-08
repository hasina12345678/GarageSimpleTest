import { TestBed } from '@angular/core/testing';
import { FirestoreService } from './firestore.service';

describe('FirestoreService', () => { // Changez Firestore à FirestoreService
  let service: FirestoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirestoreService); // Changez Firestore à FirestoreService
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});