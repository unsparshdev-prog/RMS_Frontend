import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { HeroService } from '../../hero.service';

declare var $: any;

// Role to route mapping — add more roles as needed
const ROLE_ROUTES: { [key: string]: { route: string; displayName: string } } = {
  Admin_RMS: { route: '/admin', displayName: 'Admin' },
  Leadership_RMS: { route: '/leadership-dashboard', displayName: 'Leadership' },
  HR_RMS: { route: '/hr-panel', displayName: 'HR' },
  Candidate_RMS: { route: '/candidate', displayName: 'Candidate' },
  Employee_RMS: { route: '/employee-dashboard', displayName: 'Employee' },
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginType: 'candidate' | 'employee' = 'candidate';
  email = '';
  empId = '';
  password = '';
  showPassword = false;
  rememberMe = false;
  loading = false;
  errorMessage = '';

  // Toast
  showToastMsg = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    private router: Router,
    private auth: AuthService,
    private heroService: HeroService
  ) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastMsg = true;
    setTimeout(() => {
      this.showToastMsg = false;
    }, 4000);
  }

  // Get the redirect route for an employee based on their roles
  private getEmployeeRouteForRole(roles: string[]): { route: string; displayName: string } | null {
    for (const role of roles) {
      const trimmedRole = role.trim();
      // Exact match first
      if (ROLE_ROUTES[trimmedRole]) {
        return ROLE_ROUTES[trimmedRole];
      }
      // Case-insensitive match
      const matchKey = Object.keys(ROLE_ROUTES).find(
        k => k.toLowerCase() === trimmedRole.toLowerCase()
      );
      if (matchKey) {
        return ROLE_ROUTES[matchKey];
      }
      // Partial match — role string might contain the key (e.g. DN format like cn=HR_RMS,...)
      const partialKey = Object.keys(ROLE_ROUTES).find(
        k => trimmedRole.toLowerCase().includes(k.toLowerCase())
      );
      if (partialKey) {
        return ROLE_ROUTES[partialKey];
      }
    }
    return null;
  }

  // Extract clean role name from Cordys role data which may be a string, DN, or object
  private extractRoleName(r: any): string {
    if (typeof r === 'string') {
      // May be a full DN like "cn=Employee_RMS,cn=organizational roles,..."
      if (r.startsWith('cn=') || r.includes(',cn=')) {
        const match = r.match(/^cn=([^,]+)/i);
        return match ? match[1] : r;
      }
      return r;
    }
    // Object format — try various known fields
    return r?.Description || r?.dn || r?.['#text'] || r?.text || r?.cn || String(r);
  }

  // ─── EMPLOYEE LOGIN FLOW ─────────────────────────────────────────────
  // Step 1: Cordys SSO auth with empId + password
  // Step 2: Fetch user roles via GetUserDetails
  // Step 3: Match role (Leadership_RMS / HR_RMS / Employee_RMS) and redirect

  private employeeLogin(empId: string, password: string): void {
    try {
      $.cordys.authentication.sso
        .authenticate(empId, password)
        .done((resp: any) => {
          console.log('[EmployeeLogin] Cordys SSO auth success:', resp);
          sessionStorage.setItem('employeeId', empId);
          // After Cordys auth, fetch roles and redirect
          this.fetchEmployeeRolesAndRedirect(empId);
        })
        .fail((err: any) => {
          console.error('[EmployeeLogin] Cordys SSO auth failed:', err);
          this.loading = false;
          this.errorMessage = 'The username or password you entered is incorrect.';
          this.showToast(this.errorMessage, 'error');
        });
    } catch (e) {
      console.error('[EmployeeLogin] Cordys SSO error:', e);
      this.loading = false;
      this.errorMessage = 'Authentication service is not available. Please try again later.';
      this.showToast(this.errorMessage, 'error');
    }
  }

  private async fetchEmployeeRolesAndRedirect(empId: string): Promise<void> {
    try {
      // Fetch user details from Cordys to get their roles
      const resp: any = await this.heroService.ajax(
        'GetUserDetails',
        'http://schemas.cordys.com/UserManagement/1.0/Organization',
        { UserName: empId }
      );

      console.log('[EmployeeLogin] GetUserDetails response received. Raw response:', resp);

      // Extract roles from response
      let roles: string[] = [];
      const roleData = this.heroService.xmltojson(resp, 'Role');
      console.log('[EmployeeLogin] GetUserDetails parsed Role data object:', roleData);

      // Helper to extract the text content from a role object
      const extractRoleText = (r: any): string => {
        if (typeof r === 'string') return r;
        if (r?.text) return r.text;
        if (r?.['#text']) return r['#text'];
        if (r?.['$t']) return r['$t'];
        if (r?.Description) return r.Description;
        return String(r);
      };

      if (roleData) {
        if (Array.isArray(roleData)) {
          console.log(`[EmployeeLogin] Found ${roleData.length} role(s) to process.`);
          roles = roleData.map((r: any, index: number) => {
            const text = extractRoleText(r);
            console.log(`[EmployeeLogin] Role extracted at index ${index}: '${text}' (from object: ${JSON.stringify(r)})`);
            return text;
          });
        } else {
          console.log('[EmployeeLogin] Found single role object to process.');
          const text = extractRoleText(roleData);
          console.log(`[EmployeeLogin] Single Role extracted: '${text}' (from object: ${JSON.stringify(roleData)})`);
          roles = [text];
        }
      } else {
        console.log('[EmployeeLogin] No "Role" property extracted by xmltojson block.');
      }

      console.log('[EmployeeLogin] Roles after extraction:', roles);

      // Fallback: if roles are empty or just [object Object], scan the full response string
      if (roles.length === 0 || roles.every(r => r === '[object Object]')) {
        console.warn('[EmployeeLogin] Role extraction via xmltojson failed. Scanning full response string...');
        const fullStr = JSON.stringify(resp);
        const knownRoles = Object.keys(ROLE_ROUTES);
        roles = knownRoles.filter(role => fullStr.includes(role));
        console.log('[EmployeeLogin] Roles retrieved via fallback substring scan:', roles);
      } else {
        console.log('[EmployeeLogin] Successfully extracted role values via xmltojson.');
      }

      console.log('[EmployeeLogin] Final matched User roles:', roles);

      // Store user info
      sessionStorage.setItem('displayName', empId);
      sessionStorage.setItem('employeeId', empId);
      sessionStorage.setItem('userRoles', JSON.stringify(roles));

      // Match against role routes
      const roleRoute = this.getEmployeeRouteForRole(roles);
      console.log('[EmployeeLogin] Matched roleRoute:', roleRoute);

      this.auth.setAuthenticated(true);
      this.loading = false;

      if (roleRoute) {
        console.log('[EmployeeLogin] Role matched:', roleRoute.displayName, '→', roleRoute.route);
        sessionStorage.setItem('userRole', roleRoute.displayName);
        this.router.navigate([roleRoute.route]);
      } else {
        // No matching role — redirect to landing page
        console.warn('[EmployeeLogin] No matching role found. User roles:', roles, '. Redirecting to /');
        this.router.navigate(['/']);
      }
    } catch (e) {
      console.error('[EmployeeLogin] Failed to fetch user roles:', e);
      // Redirect to landing page on error
      this.loading = false;
      this.router.navigate(['/']);
    }
  }

  // ─── CANDIDATE LOGIN FLOW (UNCHANGED) ────────────────────────────────
  // Existing candidate flow: Cordys SSO with email + password, then redirect to /candidate

  private candidateLogin(email: string, password: string): void {
    try {
      $.cordys.authentication.sso
        .authenticate(email, password)
        .done((resp: any) => {
          console.log('[CandidateLogin] Cordys SSO auth success:', resp);
          sessionStorage.setItem('displayName', email);
          sessionStorage.setItem('userRole', 'Candidate');

            // Fetch the actual candidate_id from the database
            this.heroService.getCandidateIDByEmailPassword(email, password)
              .then((idResp: any) => {
                let candId = this.heroService.xmltojson(idResp, 'candidate_id');
                if (!candId) { candId = this.heroService.xmltojson(idResp, 'Candidate_id'); }

                const extractIdText = (r: any): string => {
                  if (Array.isArray(r)) r = r[0];
                  if (!r) return '';
                  if (typeof r === 'string') return r;
                  if (r?.text) return r.text;
                  if (r?.['#text']) return r['#text'];
                  if (r?.['$t']) return r['$t'];
                  return String(r);
                };
                
                let finalId = extractIdText(candId);
                if (!finalId || finalId === '[object Object]') {
                  finalId = '';
                }
                
                if (finalId) {
                  sessionStorage.setItem('candidate_id', finalId);
                  console.log('[CandidateLogin] DB ID found:', finalId);
                  this.auth.setAuthenticated(true);
                  this.loading = false;
                  this.router.navigate(['/candidate']);
                } else {
                  console.warn('[CandidateLogin] No valid ID in login service. Trying email lookup...');
                  // Fallback: try finding by email in candidate table
                  return this.heroService.getCandidateObjects(); // we'll filter this list or something similar
                }
                return null;
              })
              .then((allCandidatesResp: any) => {
                if (!allCandidatesResp) return;
                
                // If we reach here, we are doing a manual search for the email
                try {
                  const candidates = this.heroService.xmltojson(allCandidatesResp, 'candidate');
                  const candList = Array.isArray(candidates) ? candidates : (candidates ? [candidates] : []);
                  const found = candList.find((c: any) => c.email === email);
                  
                  const extractIdText = (r: any): string => {
                    if (Array.isArray(r)) r = r[0];
                    if (!r) return '';
                    if (typeof r === 'string') return r;
                    if (r?.text) return r.text;
                    if (r?.['#text']) return r['#text'];
                    if (r?.['$t']) return r['$t'];
                    return String(r);
                  };

                  if (found) {
                    let fallbackId = extractIdText(found.candidate_id) || extractIdText(found.Candidate_id);
                    if (!fallbackId || fallbackId === '[object Object]') {
                      fallbackId = email;
                    }
                    sessionStorage.setItem('candidate_id', fallbackId);
                    console.log('[CandidateLogin] Found ID via list search:', fallbackId);
                  } else {
                    console.error('[CandidateLogin] Email not found in candidate records.');
                    sessionStorage.setItem('candidate_id', email);
                  }
                } catch (e) {
                  sessionStorage.setItem('candidate_id', email);
                }
                this.auth.setAuthenticated(true);
                this.loading = false;
                this.router.navigate(['/candidate']);
              })
            .catch((err: any) => {
              console.error('[CandidateLogin] Error during ID retrieval process:', err);
              sessionStorage.setItem('candidate_id', email);
              this.auth.setAuthenticated(true);
              this.loading = false;
              this.router.navigate(['/candidate']);
            });
        })
        .fail((err: any) => {
          this.showToast(this.errorMessage, 'error');
        });
    } catch (e) {
      console.error('[CandidateLogin] Cordys SSO error:', e);
      this.loading = false;
      this.errorMessage = 'Authentication service is not available. Please try again later.';
      this.showToast(this.errorMessage, 'error');
    }
  }

  // ─── FORM SUBMISSION ─────────────────────────────────────────────────
  onLogin(): void {
    this.errorMessage = '';
    this.loading = true;

    if (this.loginType === 'employee') {
      // Employee login: empId + password → Cordys auth → fetch role → redirect
      const empId = this.empId.trim();
      if (!empId || !this.password.trim()) {
        this.loading = false;
        this.errorMessage = 'Please enter both Employee ID and password.';
        this.showToast(this.errorMessage, 'error');
        return;
      }
      this.employeeLogin(empId, this.password);
    } else {
      // Candidate login: email + password → Cordys auth → redirect to /candidate
      const email = this.email.trim();
      if (!email || !this.password.trim()) {
        this.loading = false;
        this.errorMessage = 'Please enter both email and password.';
        this.showToast(this.errorMessage, 'error');
        return;
      }
      this.candidateLogin(email, this.password);
    }
  }
}
