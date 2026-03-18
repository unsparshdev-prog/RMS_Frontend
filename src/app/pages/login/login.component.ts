import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { HeroService } from '../../hero.service';

declare var $: any;

// Role to route mapping — add more roles as needed
const ROLE_ROUTES: { [key: string]: { route: string; displayName: string } } = {
  Leadership_RMS: { route: '/leadership-dashboard', displayName: 'Leadership' },
  HR_RMS: { route: '/hr-panel', displayName: 'HR' },
  Candidate_RMS: { route: '/candidate', displayName: 'Candidate' },
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

  constructor(
    private router: Router,
    private auth: AuthService,
    private heroService: HeroService
  ) { }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Get the redirect route based on user role
  private getRouteForRole(roles: string[]): { route: string; displayName: string } | null {
    for (const role of roles) {
      const trimmedRole = role.trim();
      if (ROLE_ROUTES[trimmedRole]) {
        return ROLE_ROUTES[trimmedRole];
      }
    }
    return null;
  }

  // Fetch user roles after authentication and redirect accordingly
  private async fetchUserRolesAndRedirect(username: string): Promise<void> {
    try {
      const resp: any = await this.heroService.ajax(
        'GetUserDetails',
        'http://schemas.cordys.com/1.0/ldap',
        { dn: username }
      );

      console.log('GetUserDetails response:', resp);

      // Extract roles from response
      let roles: string[] = [];
      const roleData = this.heroService.xmltojson(resp, 'Role');

      if (roleData) {
        if (Array.isArray(roleData)) {
          roles = roleData.map((r: any) =>
            typeof r === 'string' ? r : (r?.Description || r?.['#text'] || r?.text || String(r))
          );
        } else {
          roles = [typeof roleData === 'string' ? roleData : (roleData?.Description || roleData?.['#text'] || roleData?.text || String(roleData))];
        }
      }

      console.log('User roles:', roles);

      // Store user info
      sessionStorage.setItem('displayName', username);
      sessionStorage.setItem('employeeId', username);
      sessionStorage.setItem('userRoles', JSON.stringify(roles));

      // Find matching route for the user's role
      const roleRoute = this.getRouteForRole(roles);

      if (roleRoute) {
        sessionStorage.setItem('userRole', roleRoute.displayName);
        this.auth.setAuthenticated(true);
        this.loading = false;
        this.router.navigate([roleRoute.route]);
      } else {
        // No matching role — fallback based on loginType
        this.auth.setAuthenticated(true);
        this.loading = false;
        const fallback = this.loginType === 'candidate' ? '/candidate' : '/leadership-dashboard';
        console.warn('No matching role found. User roles:', roles, '. Falling back to', fallback);
        this.router.navigate([fallback]);
      }
    } catch (e) {
      console.error('Failed to fetch user roles:', e);
      // Still authenticated, redirect based on loginType
      this.auth.setAuthenticated(true);
      this.loading = false;
      const fallback = this.loginType === 'candidate' ? '/candidate' : '/leadership-dashboard';
      this.router.navigate([fallback]);
    }
  }

  // Perform Cordys SSO authentication
  private authenticateWithCordys(username: string, password: string): void {
    try {
      $.cordys.authentication.sso
        .authenticate(username, password)
        .done((resp: any) => {
          console.log('Cordys SSO authenticate done:', resp);
          // Store employee ID immediately on successful auth
          sessionStorage.setItem('employeeId', username);
          // After successful authentication, fetch user roles to determine redirect
          this.fetchUserRolesAndRedirect(username);
        })
        .fail((err: any) => {
          console.error('Cordys SSO authenticate failed:', err);
          this.loading = false;
          this.errorMessage = 'Authentication failed. Please check your credentials.';
        });
    } catch (e) {
      console.error('Cordys SSO error:', e);
      this.loading = false;
      this.errorMessage = 'Authentication service is not available. Please try again later.';
    }
  }

  // Called when the form is submitted
  onLogin(): void {
    this.errorMessage = '';
    this.loading = true;

    // Determine login identifier based on login type
    const username = this.loginType === 'employee' ? this.empId.trim() : this.email.trim();

    // Validate inputs
    if (!username || !this.password.trim()) {
      this.loading = false;
      this.errorMessage = this.loginType === 'employee'
        ? 'Please enter both Employee ID and password.'
        : 'Please enter both email and password.';
      return;
    }

    // Authenticate with Cordys SSO
    this.authenticateWithCordys(username, this.password);
  }
}
