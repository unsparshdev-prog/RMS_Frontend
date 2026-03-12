import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  company = '';
  showPassword = false;
  showConfirmPassword = false;
  agreeToTerms = false;

  get passwordStrength(): string {
    if (!this.password) return '';
    if (this.password.length < 6) return 'weak';
    if (this.password.length < 10) return 'medium';
    const hasUpperCase = /[A-Z]/.test(this.password);
    const hasLowerCase = /[a-z]/.test(this.password);
    const hasNumbers = /\d/.test(this.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(this.password);
    const criteria = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
    if (criteria >= 3 && this.password.length >= 10) return 'strong';
    if (criteria >= 2) return 'medium';
    return 'weak';
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSignup(): void {
    if (!this.agreeToTerms) return;
    console.log('Signup attempt:', {
      fullName: this.fullName,
      email: this.email,
      company: this.company
    });
    // TODO: Implement actual signup logic
  }
}
