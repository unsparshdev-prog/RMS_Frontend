import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onLogin(): void {
    if (this.loginType === 'candidate') {
      console.log('Candidate Login attempt:', { email: this.email, rememberMe: this.rememberMe });
    } else {
      console.log('Employee Login attempt:', { empId: this.empId, rememberMe: this.rememberMe });
    }
    // TODO: Implement actual login logic
  }
}
