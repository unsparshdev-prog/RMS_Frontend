import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent implements OnInit {

  // --- State flags ---
  isParsing = false;
  isSaving = false;
  isApproved = false;
  isDragging = false;

  // --- Toast / Status ---
  statusMessage = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  showStatus = false;

  // --- Data ---
  parsedData: any = null;
  selectedFile: File | null = null;
  selectedFileName = '';
  selectedFileSize = '';
  selectedFileType = '';

  // --- Persisted resume info (from DB) ---
  resumeFileName = '';

  // --- Stored details toggle ---
  showStoredDetails = false;
  isLoadingStoredDetails = false;
  storedCandidateFields: { label: string; value: string }[] = [];

  // --- Step 6: Final output ---
  finalCandidate: any = null;
  finalCandidateFields: { label: string; value: string }[] = [];

  // --- Step Progress ---
  currentStep = 0;
  workflowSteps = ['Upload', 'Parse', 'Review', 'Upload to Server', 'Save to DB', 'Done'];

  // --- Constants ---
  private readonly DOWNLOAD_BASE = 'http://43.242.214.239:81/home/training2025/MAHINDRA_UPLOADS/Intern_Uploads';

  constructor(private heroService: HeroService, private router: Router) {}

  // =====================================================================
  //  LIFECYCLE
  // =====================================================================
  ngOnInit(): void {
    const candidateId = sessionStorage.getItem('candidate_id');
    if (candidateId) {
      this.loadExistingResume(candidateId);
    } else {
      console.warn('No candidate_id in session.');
    }
  }

  private async loadExistingResume(candidateId: string) {
    try {
      const resp = await this.heroService.getCandidateObject(candidateId);
      const candidate = this.heroService.xmltojson(resp, 'candidate');
      if (candidate) {
        const path: string = this.extractTextField(candidate.resume_path);
        if (path) {
          this.resumeFileName = this.bareFileName(path);
        }
      }
    } catch (err) {
      console.error('Could not load existing resume:', err);
    }
  }

  // =====================================================================
  //  TOGGLE STORED CANDIDATE DETAILS
  // =====================================================================
  async toggleStoredDetails() {
    this.showStoredDetails = !this.showStoredDetails;

    if (this.showStoredDetails && this.storedCandidateFields.length === 0) {
      const candidateId = sessionStorage.getItem('candidate_id');
      if (!candidateId) return;

      this.isLoadingStoredDetails = true;
      try {
        const resp = await this.heroService.getCandidateObject(candidateId);
        const candidate = this.heroService.xmltojson(resp, 'candidate');
        if (candidate) {
          const ext = (field: any): string => {
            if (!field) return '';
            if (typeof field === 'string') return field;
            return field.text || field['#text'] || '';
          };
          this.storedCandidateFields = [
            { label: 'Candidate ID', value: ext(candidate.candidate_id) },
            { label: 'Name', value: ext(candidate.name) },
            { label: 'Email', value: ext(candidate.email) },
            { label: 'Phone', value: ext(candidate.phone) },
            { label: 'Skills', value: ext(candidate.skills) },
            { label: 'Experience', value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
            { label: 'Education', value: ext(candidate.education) },
            { label: 'Resume File', value: ext(candidate.resume_path) }
          ];
        }
      } catch (err) {
        console.error('Failed to load candidate details:', err);
      } finally {
        this.isLoadingStoredDetails = false;
      }
    }
  }

  // =====================================================================
  //  FILE SELECTION
  // =====================================================================
  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragging = true; }
  onDragLeave() { this.isDragging = false; }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) this.handleFile(files[0]);
  }

  onFileSelect(e: Event) {
    const el = e.target as HTMLInputElement;
    if (el.files && el.files.length > 0) this.handleFile(el.files[0]);
  }

  removeFile() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.parsedData = null;
    this.isApproved = false;
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
  }

  private handleFile(file: File) {
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.selectedFileSize = (file.size / 1024).toFixed(2) + ' KB';
    this.selectedFileType = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    this.isApproved = false;
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
    this.showToast('File selected: ' + file.name, 'info');

    this.parseResumeWithAffinda(file);
  }

  // =====================================================================
  //  RESUME PARSING via Affinda  (Step 1)
  // =====================================================================
  async parseResumeWithAffinda(file: File) {
    this.isParsing = true;
    this.parsedData = null;
    this.currentStep = 1;

    try {
      this.showToast('Submitting resume to Affinda AI...', 'info');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/affinda/parse-resume', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit resume for parsing.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Ignore response parsing failure and keep default message.
        }
        throw new Error(errorMessage);
      }

      const affindaResponse = await response.json();
      const documentData = affindaResponse?.data || affindaResponse;

      const mappedData = {
        name: this.extractAffindaName(documentData),
        email: this.extractAffindaEmail(documentData),
        phone: this.extractAffindaPhone(documentData),
        skills: this.extractAffindaSkills(documentData),
        experience: this.extractAffindaExperience(documentData),
        education: this.extractAffindaEducation(documentData)
      };

      this.parsedData = this.normalizeNulls(mappedData);
      this.currentStep = 2;
      this.showToast('Resume parsed successfully with Affinda AI!', 'success');

    } catch (err: any) {
      console.error('Affinda parse error:', err);
      this.showToast('Failed to parse Resume: ' + (err.message || err), 'error');
      this.parsedData = { name: null, email: null, phone: null, skills: null, experience: null, education: null };
      this.currentStep = 2;
      this.isApproved = false;
    } finally {
      this.isParsing = false;
    }
  }

  // =====================================================================
  //  DOWNLOAD URL
  // =====================================================================
  getResumeDownloadUrl(): string {
    if (!this.resumeFileName) return '#';
    return `${this.DOWNLOAD_BASE}/${this.resumeFileName}`;
  }

  // =====================================================================
  //  MAIN FLOW: UPLOAD -> SAVE -> FETCH  (Steps 3, 4, 5)
  // =====================================================================
  async processUploadAndSave() {
    if (!this.selectedFile || !this.parsedData) {
      this.showToast('Please upload a resume first.', 'error');
      return;
    }
    if (!this.isApproved) {
      this.showToast('Please approve the parsed details before saving.', 'error');
      return;
    }
    const candidateId = sessionStorage.getItem('candidate_id');
    if (!candidateId) {
      this.showToast('You must be logged in. Please login and try again.', 'error');
      return;
    }

    this.isSaving = true;
    this.showToast('Uploading resume to server...', 'info');

    try {
      this.currentStep = 3;
      const base64 = await this.fileToBase64(this.selectedFile);
      console.log(`Uploading: ${this.selectedFile.name} (${this.selectedFile.size} bytes, base64 len=${base64.length})`);

      const uploadResp = await this.heroService.uploadDocumentsRMS(this.selectedFile.name, base64);
      console.log('Upload response (XMLDocument):', uploadResp);

      let serverPath = '';
      if (uploadResp instanceof Document) {
        const el = uploadResp.getElementsByTagName('UploadDocuments_RMS')[0];
        if (el) serverPath = el.textContent || '';
      }

      if (serverPath) {
        this.resumeFileName = this.bareFileName(serverPath);
      } else {
        console.warn('Could not extract path from response, using original filename.');
        this.resumeFileName = this.selectedFile.name;
      }

      console.log('Resume file name:', this.resumeFileName);
      this.showToast('File uploaded! Saving to profile...', 'info');

      this.currentStep = 4;
      const fields: any = {
        name: this.parsedData.name || '',
        phone: this.parsedData.phone || '',
        skills: this.parsedData.skills || '',
        experience: this.parsedData.experience ?? 0,
        education: this.parsedData.education || '',
        resume_path: this.resumeFileName
      };
      await this.heroService.updateCandidate(candidateId, fields);

      const freshResp = await this.heroService.getCandidateObject(candidateId);
      console.log('Verified candidate:', freshResp);

      const candidateObj = this.heroService.xmltojson(freshResp, 'candidate');
      this.buildFinalOutput(candidateObj);

      this.currentStep = 5;
      this.showToast('Resume uploaded and saved successfully!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Upload/save error:', err);
      this.showToast('Error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      this.isSaving = false;
    }
  }

  // =====================================================================
  //  STEP 6: Build Final Output
  // =====================================================================
  private buildFinalOutput(candidate: any) {
    if (!candidate) {
      this.finalCandidate = null;
      return;
    }

    this.finalCandidate = candidate;

    const ext = (field: any): string => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return field.text || field['#text'] || '';
    };

    this.finalCandidateFields = [
      { label: 'Candidate ID', value: ext(candidate.candidate_id) },
      { label: 'Name', value: ext(candidate.name) },
      { label: 'Email', value: ext(candidate.email) },
      { label: 'Phone', value: ext(candidate.phone) },
      { label: 'Skills', value: ext(candidate.skills) },
      { label: 'Experience', value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
      { label: 'Education', value: ext(candidate.education) },
      { label: 'Resume File', value: ext(candidate.resume_path) }
    ];
  }

  // =====================================================================
  //  RESET WORKFLOW (allow re-upload)
  // =====================================================================
  resetWorkflow() {
    this.finalCandidate = null;
    this.finalCandidateFields = [];
    this.currentStep = 0;
    this.parsedData = null;
    this.selectedFile = null;
    this.selectedFileName = '';
    this.isApproved = false;
  }

  // =====================================================================
  //  TOAST NOTIFICATIONS
  // =====================================================================
  showToast(message: string, type: 'success' | 'error' | 'info') {
    this.statusMessage = message;
    this.statusType = type;
    this.showStatus = true;

    if (type !== 'info' || !this.isSaving) {
      setTimeout(() => { this.showStatus = false; }, 5000);
    }
  }

  dismissToast() {
    this.showStatus = false;
  }

  // =====================================================================
  //  UTILITIES
  // =====================================================================
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.substring(dataUrl.indexOf(',') + 1));
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  private bareFileName(path: string): string {
    if (!path) return '';
    return path.split(/[/\\]/).pop() || path;
  }

  private extractTextField(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field.text || field['#text'] || '';
  }

  private extractAffindaName(data: any): string | null {
    const rawName = data?.candidateName || data?.name;
    if (typeof rawName === 'string') return rawName;
    if (rawName?.raw) return rawName.raw;
    if (rawName?.parsed?.firstName?.parsed || rawName?.parsed?.familyName?.parsed) {
      return [
        rawName?.parsed?.firstName?.parsed || '',
        rawName?.parsed?.middleName?.parsed || '',
        rawName?.parsed?.familyName?.parsed || ''
      ].filter(Boolean).join(' ').trim();
    }
    if (rawName?.text) return rawName.text;
    return null;
  }

  private extractAffindaEmail(data: any): string | null {
    const email = data?.email?.[0] || data?.email || data?.emails?.[0] || data?.candidateEmail;
    if (typeof email === 'string') return email;
    if (email?.parsed) return email.parsed;
    if (email?.raw) return email.raw;
    return this.extractRegex(data, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  }

  private extractAffindaPhone(data: any): string | null {
    const phone = data?.phoneNumber?.[0] || data?.phoneNumber || data?.phone || data?.phoneNumbers?.[0] || data?.candidatePhone;
    if (typeof phone === 'string') return phone;
    if (phone?.parsed?.formattedNumber) return phone.parsed.formattedNumber;
    if (phone?.parsed?.rawText) return phone.parsed.rawText;
    if (phone?.parsed?.nationalNumber) return phone.parsed.nationalNumber;
    if (phone?.raw) return phone.raw;
    return this.extractRegex(data, /\+?\d[\d\s\-\(\)]{8,}/);
  }

  private extractAffindaExperience(data: any): number | null {
    const direct = data?.totalYearsExperience?.parsed
      ?? data?.totalYearsExperience
      ?? data?.yearsOfExperience
      ?? data?.years_experience;
    if (typeof direct === 'number') return Math.floor(direct);
    if (typeof direct === 'string' && direct.trim() !== '') {
      const parsed = Number(direct);
      return Number.isNaN(parsed) ? null : Math.floor(parsed);
    }
    return null;
  }

  private extractAffindaSkills(data: any): string | null {
    const collected = new Set<string>();
    const addSkill = (value: any) => {
      if (!value) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) collected.add(trimmed);
        return;
      }
      if (value?.name) addSkill(value.name);
      if (value?.raw) addSkill(value.raw);
      if (value?.parsed?.name) addSkill(value.parsed.name);
    };

    if (Array.isArray(data?.skill)) {
      data.skill.forEach((skill: any) => addSkill(skill));
    }

    if (Array.isArray(data?.skills)) {
      data.skills.forEach((skill: any) => addSkill(skill));
    }

    return collected.size > 0 ? Array.from(collected).join(', ') : null;
  }

  private extractAffindaEducation(data: any): string | null {
    const entries = Array.isArray(data?.education) ? data.education : data?.educationQualifications;
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const formatted = entries
      .map((entry: any) => {
        const parsed = entry?.parsed || entry;
        const degree = parsed?.educationAccreditation?.parsed
          || parsed?.accreditation?.education
          || entry?.degree
          || entry?.degree_type
          || '';
        const majors = Array.isArray(parsed?.educationMajor)
          ? parsed.educationMajor.map((m: any) => m?.parsed || m?.raw || '').filter(Boolean).join(', ')
          : (parsed?.accreditation?.inputStr || parsed?.specialization_subjects || '');
        const school = parsed?.educationOrganization?.parsed
          || parsed?.organization
          || parsed?.institution_name
          || parsed?.school_name
          || '';
        const year = parsed?.educationDates?.parsed?.end?.year || parsed?.educationDates?.raw || '';
        return [degree, majors, school, year].filter(Boolean).join(' - ').trim();
      })
      .filter(Boolean);

    return formatted.length > 0 ? formatted[0] : null;
  }

  private extractRegex(obj: any, regex: RegExp): string | null {
    if (!obj) return null;
    if (typeof obj === 'string') {
      const match = obj.match(regex);
      return match ? match[0] : null;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = this.extractRegex(item, regex);
        if (found) return found;
      }
      return null;
    }
    if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const found = this.extractRegex(obj[key], regex);
        if (found) return found;
      }
    }
    return null;
  }

  /** Ensure missing parsed fields are explicitly null (not empty string) */
  private normalizeNulls(data: any): any {
    const result: any = {};
    for (const key of ['name', 'email', 'phone', 'skills', 'education']) {
      result[key] = data[key] && data[key] !== '' ? data[key] : null;
    }
    result.experience = (data.experience !== undefined && data.experience !== null && data.experience !== '')
      ? data.experience
      : null;
    return result;
  }
}
