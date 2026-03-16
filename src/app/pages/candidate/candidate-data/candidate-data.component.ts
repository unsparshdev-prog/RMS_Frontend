import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-candidate-data',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-data.component.html',
  styleUrls: ['./candidate-data.component.css']
})
export class CandidateDataComponent {
  profile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    experience: '5',
    currentRole: 'Senior Frontend Developer',
    currentCompany: 'TechCorp Solutions',
    skills: 'Angular, TypeScript, JavaScript, HTML, CSS, React, Node.js',
    education: 'B.Tech in Computer Science, IIT Delhi (2019)',
    linkedin: 'https://linkedin.com/in/johndoe',
    portfolio: 'https://johndoe.dev',
    about: 'Passionate frontend developer with 5+ years of experience building modern web applications. Expert in Angular and TypeScript with a strong focus on performance optimization and user experience.'
  };

  onSave(): void {
    console.log('Profile saved:', this.profile);
    // TODO: Save with backend
  }
}
