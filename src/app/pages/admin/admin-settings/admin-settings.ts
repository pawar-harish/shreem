import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService, FirebaseConfigModel } from '../../../services/firebase.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrls: ['./admin-settings.scss']
})
export class AdminSettingsComponent implements OnInit {
  public firebaseService = inject(FirebaseService);

  public config = signal<FirebaseConfigModel>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  public isSaving = signal<boolean>(false);
  public isSeeding = signal<boolean>(false);
  public feedbackMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  ngOnInit(): void {
    this.config.set(this.firebaseService.getConfig());
  }

  public async saveAndConnect(): Promise<void> {
    this.isSaving.set(true);
    this.feedbackMessage.set(null);

    try {
      this.firebaseService.saveConfig(this.config());
      this.feedbackMessage.set({
        type: 'success',
        text: 'Firebase credentials saved. Attempting connection to Firestore...'
      });
    } catch (e: any) {
      this.feedbackMessage.set({
        type: 'error',
        text: 'Failed to apply credentials: ' + (e?.message || '')
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  public resetToDefault(): void {
    this.config.set(environment.firebase);
    this.firebaseService.saveConfig(environment.firebase);
    this.feedbackMessage.set({
      type: 'info',
      text: 'Reverted to default configuration.'
    });
  }

  public async seedDataToFirestore(): Promise<void> {
    this.isSeeding.set(true);
    this.feedbackMessage.set(null);

    try {
      const result = await this.firebaseService.seedAllDataToFirestore();
      if (result.success) {
        this.feedbackMessage.set({
          type: 'success',
          text: `Success! Seeded ${result.count} clothing items & categories directly into your Cloud Firestore collections!`
        });
      } else {
        this.feedbackMessage.set({
          type: 'error',
          text: `Could not seed to Firestore: ${result.error}. (Make sure Firestore database is created in your Firebase Console and rules permit writes).`
        });
      }
    } catch (err: any) {
      this.feedbackMessage.set({
        type: 'error',
        text: 'Seeding error: ' + (err?.message || 'Check Firestore connection')
      });
    } finally {
      this.isSeeding.set(false);
    }
  }

  public resetLocalData(): void {
    this.firebaseService.resetLocalDemoData();
    this.feedbackMessage.set({
      type: 'info',
      text: 'Local storage reset to default pristine clothing collection.'
    });
  }
}

