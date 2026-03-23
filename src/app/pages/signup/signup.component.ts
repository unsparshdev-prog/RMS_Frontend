import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../hero.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
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
  loading = false;
  errorMsg = '';

  constructor(private heroService: HeroService, private router: Router) {}

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
    if (!this.agreeToTerms || !this.passwordsMatch) return;
    this.loading = true;
    this.errorMsg = '';

    // Step 1: Authenticate with sysadmin to gain rights to create user
    this.heroService.authenticateSSO('sysadmin', 'sys@admin')
      .then(() => {
        // Step 2: Call CreateUserInOrganization Service to create the Cordys SSO User
        return this.heroService.createUserInOrganization({
          userName: this.email,
          description: this.fullName,
          userId: this.email,
          password: this.password,
          role: 'Candidate_RMS'
        });
      })
      .then((userResponse: any) => {
        // console.log('User created in organization successfully. Response:', userResponse);
        
        // Step 3: Create the Candidate record using UpdateCandidate service
        // We do this while still under sysadmin SSO to have write permissions.
        return this.heroService.createCandidate(this.fullName, this.email);
      })
      .then((candidateResp: any) => {
        // console.log('Candidate record created successfully. Response:', candidateResp);

        let candidateId: string | undefined = undefined;
        try {
          // Robust extraction: try multiple case variations often used by Cordys
          let extId = this.heroService.xmltojson(candidateResp, 'candidate_id');
          if (!extId) { extId = this.heroService.xmltojson(candidateResp, 'Candidate_id'); }
          if (!extId) { extId = this.heroService.xmltojson(candidateResp, 'CANDIDATE_ID'); }

          const extractIdText = (r: any): string => {
            if (Array.isArray(r)) r = r[0];
            if (!r) return '';
            if (typeof r === 'string') return r;
            if (r?.text) return r.text;
            if (r?.['#text']) return r['#text'];
            if (r?.['$t']) return r['$t'];
            return String(r);
          };
          
          if (extId) {
            let extracted = extractIdText(extId);
            if (extracted && extracted !== '[object Object]') {
              candidateId = extracted;
            }
          }
        } catch (e) {
          console.warn('Silent error extracting candidateId:', e);
        }

        if (!candidateId) {
          console.warn('Warning: candidate_id could not be extracted. Falling back to email to prevent unlinked records.');
          candidateId = this.email;
        }

        // Step 4: Call the UpdateCandidate_login service
        return this.heroService.createCandidateLogin(this.fullName, this.email, this.password, candidateId);
      })
      .then((loginResponse: any) => {
        // console.log('Candidate login record created successfully. Response:', loginResponse);
        
        // Step 5: Logout sysadmin and redirect to login page for the user to login with their new credentials
        return this.heroService.logoutAndRedirect('/login');
      })
      .then(() => {
        // console.log('Logout and redirected to login successfully.');
        this.loading = false;
      })
      .catch((err: any) => {
        console.error('Signup error:', err);
        // Add detailed logging of the possible SOAP fault string for debugging 500 errors
        if (err && err[0] && err[0].responseText) {
          console.error('SOAP Fault Response Data:', err[0].responseText);
        }
        let extractedError = '';
        try {
          const rText = err[0]?.responseText || err?.responseText || err?.message || String(err);
          if (rText.includes('already exists')) {
            extractedError = `An account with the email ${this.email} already exists. Please login instead.`;
          } else {
            const faultMatch = rText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
            if (faultMatch && faultMatch[1]) {
              extractedError = faultMatch[1];
            }
          }
        } catch (e) {
          // fallback
        }

        this.errorMsg = extractedError || 'Failed to create account. Please try again.';
        this.loading = false;
      });
  }
}
