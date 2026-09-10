import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../../hero.service';

declare const $: any;

@Component({
  selector: 'app-candidate-data',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './candidate-data.component.html',
  styleUrls: ['./candidate-data.component.css']
})
export class CandidateDataComponent implements OnInit {
  loading = true;
  saving = false;
  isEditing = false;
  error = '';
  candidateId = '';

  profile: any = {
    candidate_id: '',
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience: '',
    education: '',
    resume_path: '',
    source: '',
    ready_to_relocate: '',
    notice_period: '',
    expected_salary: '',
    linkedin_url: '',
    has_referral: '',
    referral_id: '',
    created_at: '',
    created_by: ''
  };

  constructor(private heroService: HeroService) {
    this.candidateId = sessionStorage.getItem('candidate_id') || '';
  }

  ngOnInit(): void {
    if (!this.candidateId) {
      this.error = 'You must be logged in to view your profile.';
      this.loading = false;
      return;
    }
    this.loadCandidateData();
  }

  async loadCandidateData(): Promise<void> {
    this.loading = true;
    this.error = '';

    const ext = (field: any): string => {
      if (!field) return '';
      if (typeof field === 'string') return field.trim();
      return (field.text || field['#text'] || field['$t'] || '').trim();
    };

    try {
      let candidate: any = null;

      // 1. Try by candidate_id
      try {
        const resp = await this.heroService.getCandidateObject(this.candidateId);
        candidate = this.heroService.xmltojson(resp, 'candidate');
      } catch (e) {
        console.warn('[CandidateData] Lookup by ID failed, trying by email...', e);
      }

      // 2. If not found, try by email
      if (!candidate && this.candidateId) {
        try {
          const emailResp = await this.heroService.getCandidateByEmail(this.candidateId);
          candidate = this.heroService.xmltojson(emailResp, 'candidate');
        } catch (e) {
          console.warn('[CandidateData] Lookup by email failed, trying list search...', e);
        }
      }

      // 3. If still not found, search in candidate list
      if (!candidate && this.candidateId) {
        try {
          const allResp = await this.heroService.getCandidateObjects();
          const candidates = this.heroService.xmltojson(allResp, 'candidate');
          const list = Array.isArray(candidates) ? candidates : (candidates ? [candidates] : []);
          const search = this.candidateId.toLowerCase().trim();
          candidate = list.find((c: any) => {
            const email = ext(c.email).toLowerCase();
            const id = ext(c.candidate_id || c.Candidate_id).toLowerCase();
            return email === search || id === search || (search.includes('@') && email === search.split('@')[0]);
          });
        } catch (e) {
          console.warn('[CandidateData] List search failed...', e);
        }
      }

      if (candidate) {
        const extractedId = ext(candidate.candidate_id || candidate.Candidate_id);
        if (extractedId) {
          this.candidateId = extractedId;
          sessionStorage.setItem('candidate_id', extractedId);
        }

        this.profile = {
          candidate_id: extractedId || '',
          name: ext(candidate.name),
          email: ext(candidate.email),
          phone: ext(candidate.phone),
          skills: ext(candidate.skills),
          experience: ext(candidate.experience) || '0',
          education: ext(candidate.education),
          resume_path: ext(candidate.resume_path),
          source: ext(candidate.source),
          ready_to_relocate: String(ext(candidate.ready_to_relocate)) === 'true',
          notice_period: ext(candidate.notice_period) || '0',
          expected_salary: ext(candidate.expected_salary) || '0',
          linkedin_url: ext(candidate.linkedin_url),
          has_referral: String(ext(candidate.has_referral)) === 'true',
          referral_id: ext(candidate.referral_id),
          created_at: ext(candidate.created_at),
          created_by: ext(candidate.created_by)
        };
      } else {
        this.error = `No profile data found for account (${this.candidateId}). Please upload your resume to complete your candidate profile.`;
      }
    } catch (err: any) {
      console.error('[CandidateData] Error loading candidate data:', err);
      this.error = 'Unable to fetch profile data. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  getInitials(): string {
    if (!this.profile.name) return 'C';
    const parts = this.profile.name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }

  toggleEdit(): void {
    if (this.isEditing) {
      // Cancel edit: revert changes by reloading from server
      this.isEditing = false;
      this.loadCandidateData();
    } else {
      this.isEditing = true;
    }
  }

  onSave(): void {
    if (this.saving || !this.isEditing) return;
    this.saving = true;
    this.error = '';

    const updatedFields: any = {
      email: this.profile.email,
      phone: this.profile.phone,
      skills: this.profile.skills,
      experience: this.profile.experience,
      education: this.profile.education,
      expected_salary: this.profile.expected_salary,
      name: this.profile.name,
      source: this.profile.source,
      ready_to_relocate: this.profile.ready_to_relocate,
      notice_period: this.profile.notice_period,
      linkedin_url: this.profile.linkedin_url
    };

    this.heroService.updateCandidate(this.profile.candidate_id, updatedFields)
      .then((response: any) => {
        this.saving = false;
        this.isEditing = false;
        this.loadCandidateData();
      }).catch((err: any) => {
        console.error('Error saving candidate data:', err);
        this.error = 'Failed to save candidate data. Please try again.';
        this.saving = false;
      });
  }

  isDownloadingResume = false;

  async viewResume(): Promise<void> {
    if (!this.profile.resume_path) return;
    const fileName = this.profile.resume_path.split(/[/\\]/).pop() || this.profile.resume_path;
    this.isDownloadingResume = true;
    try {
      const base64 = await this.heroService.downloadDocumentRMS(fileName);
      if (base64) {
        this.heroService.openBase64Document(base64, fileName);
      } else {
        alert('Resume content is empty.');
      }
    } catch (e) {
      console.error('Failed to download resume:', e);
      alert('Unable to load resume from server.');
    } finally {
      this.isDownloadingResume = false;
    }
  }
}
