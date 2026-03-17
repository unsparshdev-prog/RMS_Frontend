import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authenticated = false;

  constructor() {
    // Restore auth state from sessionStorage
    try {
      this.authenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    } catch (e) {
      this.authenticated = false;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  setAuthenticated(value: boolean): void {
    this.authenticated = value;
    try {
      if (value) {
        sessionStorage.setItem('isAuthenticated', 'true');
      } else {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('displayName');
        sessionStorage.removeItem('candidate_id');
        sessionStorage.removeItem('userRole');
      }
    } catch (e) {
      console.warn('Unable to access sessionStorage', e);
    }
  }

  logout(): void {
    this.setAuthenticated(false);
  }

  getDisplayName(): string {
    try {
      return sessionStorage.getItem('displayName') || '';
    } catch (e) {
      return '';
    }
  }

  getCandidateId(): string {
    try {
      return sessionStorage.getItem('candidate_id') || '';
    } catch (e) {
      return '';
    }
  }

  getUserRole(): string {
    try {
      return sessionStorage.getItem('userRole') || '';
    } catch (e) {
      return '';
    }
  }
}
