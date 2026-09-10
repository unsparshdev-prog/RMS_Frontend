import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-upload.html',
  styleUrls: ['./resume-upload.css'],
})
export class ResumeUpload {
  fileName = '';
  isParsing = false;
  message = '';

  parsed = {
    name: '',
    email: '',
    phone: '',
    skills: ''
  };

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.fileName = file.name;
    this.parseFile(file);
  }

  private parseFile(file: File): void {
    this.isParsing = true;
    this.message = 'Parsing...';

    // Simple text parsing for plain text resumes. PDFs are not parsed here.
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        this.extractFromText(text);
        this.isParsing = false;
        this.message = 'Parsed (basic)';
      };
      reader.onerror = () => {
        this.isParsing = false;
        this.message = 'Failed to read file';
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      // PDF parsing in-browser requires additional libraries; delegate to backend in real app.
      this.isParsing = false;
      this.message = 'PDF parsing not supported in-browser; send to backend for parsing.';
    } else {
      this.isParsing = false;
      this.message = 'Unsupported file type; try a .txt resume for local parsing.';
    }
  }

  private extractFromText(text: string): void {
    // email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
    // phone (simple heuristic)
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let name = '';
    if (lines.length) {
      // heuristics: first line that looks like a name (capitalized words)
      const candidate = lines[0];
      if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3}$/.test(candidate)) {
        name = candidate;
      } else {
        const nameLine = lines.find(l => /^name[:\s]/i.test(l));
        if (nameLine) name = nameLine.replace(/name[:\s]/i, '').trim();
      }
    }

    // skills section heuristic
    let skills = '';
    const skillsIndex = lines.findIndex(l => /skills?/i.test(l));
    if (skillsIndex >= 0) {
      skills = lines.slice(skillsIndex + 1, skillsIndex + 4).join(', ');
    }

    this.parsed.name = name;
    this.parsed.email = emailMatch ? emailMatch[0] : '';
    this.parsed.phone = phoneMatch ? phoneMatch[0] : '';
    this.parsed.skills = skills;
  }

  submitProfile(): void {
    this.message = 'Submitting (mock)...';
    // Mock submit; replace with actual API call
    setTimeout(() => {
      this.message = 'Profile saved (mock)';
    }, 800);
  }

  clear(): void {
    this.parsed.name = '';
    this.parsed.email = '';
    this.parsed.phone = '';
    this.parsed.skills = '';
    this.fileName = '';
    this.message = '';
  }
}
