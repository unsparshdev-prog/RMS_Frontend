import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

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

    // If opening and we haven't loaded yet (or want to refresh), fetch from DB
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
            { label: 'Name',         value: ext(candidate.name) },
            { label: 'Email',        value: ext(candidate.email) },
            { label: 'Phone',        value: ext(candidate.phone) },
            { label: 'Skills',       value: ext(candidate.skills) },
            { label: 'Experience',   value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
            { label: 'Education',    value: ext(candidate.education) },
            { label: 'Resume File',  value: ext(candidate.resume_path) }
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
    e.preventDefault(); this.isDragging = false;
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

    this.parseResumeWithApyHub(file);
  }

  // =====================================================================
  //  RESUME PARSING via ApyHub SharpAPI  (Step 1)
  // =====================================================================
  async parseResumeWithApyHub(file: File) {
    this.isParsing = true;
    this.parsedData = null;
    this.currentStep = 1;

    const apiKey = (environment as any).apyhubApiKey;
    if (!apiKey) {
      this.showToast('ApyHub API key not configured.', 'error');
      this.isParsing = false;
      return;
    }

    try {
      this.showToast('Submitting resume to ApyHub AI…', 'info');
      
      const formData = new FormData();
      formData.append('file', file);

      // Step 1: Submit file to API
      const submitResponse = await fetch('https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume', {
        method: 'POST',
        headers: {
          'apy-token': apiKey
        },
        body: formData
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit resume for parsing.');
      }

      const submitData = await submitResponse.json();
      const statusUrl = submitData.status_url;

      if (!statusUrl) {
         throw new Error('Invalid response from parsing API.');
      }

      this.showToast('Resume submitted successfully. Waiting for AI processing...', 'info');

      // Step 2: Poll status until complete
      let jobResult: any = null;
      let attempts = 0;

      // Extract Job ID to proxy through local backend and bypass CORS
      const parts = statusUrl.split('/');
      const jobId = parts[parts.length - 1];
      const proxyUrl = `http://localhost:3001/api/apyhub/status/${jobId}`;
      
      while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Fetch via Node backend
        const statusResponse = await fetch(proxyUrl);
        
        if (!statusResponse.ok) continue;
        
        const statusData = await statusResponse.json();
        const status = statusData.data?.attributes?.status;
        
        if (status === 'success') {
           jobResult = statusData.data.attributes.result;
           break;
        } else if (status === 'failed') {
           throw new Error('Parsing job failed at server.');
        }
        
        attempts++;
      }

      if (!jobResult) {
        throw new Error('Parsing timed out.');
      }

      // Map ApyHub result to our format exactly based on SharpAPI signature
      let name = jobResult.candidate_name || null;
      let email = jobResult.candidate_email || null;
      let phone = jobResult.candidate_phone || null;
      let experienceNum = jobResult.years_of_experience || 0;

      // Extract skills from all positions and flatten into a unique list
      let allSkills = new Set<string>();
      if (Array.isArray(jobResult.positions)) {
        jobResult.positions.forEach((pos: any) => {
          if (Array.isArray(pos.skills)) {
            pos.skills.forEach((skill: string) => allSkills.add(skill));
          }
        });
      }
      // If skills array exists at the root (just in case), add those too
      if (Array.isArray(jobResult.skills)) {
        jobResult.skills.forEach((skill: any) => {
          if (typeof skill === 'string') allSkills.add(skill);
        });
      }
      let skills = allSkills.size > 0 ? Array.from(allSkills).join(', ') : null;

      // Extract Education
      let education = null;
      if (Array.isArray(jobResult.education_qualifications) && jobResult.education_qualifications.length > 0) {
        const edu = jobResult.education_qualifications[0];
        const degree = edu.degree_type || '';
        const spec = edu.specialization_subjects ? ` in ${edu.specialization_subjects}` : '';
        const school = edu.school_name || '';
        education = `${degree}${spec} - ${school}`.trim();
        if (education.startsWith('- ')) education = education.substring(2);
      } else if (Array.isArray(jobResult.education) && jobResult.education.length > 0) {
        // Fallback for different version
        const edu = jobResult.education[0];
        education = `${edu.degree || edu.title || ''} - ${edu.institution_name || edu.school || ''}`.trim();
      }

      // Robust fallback search for Email and Phone if they were blank
      const extractRegex = (obj: any, regex: RegExp): string | null => {
        if (!obj) return null;
        if (typeof obj === 'string') {
          const m = obj.match(regex);
          if (m) return m[0];
        }
        if (typeof obj === 'object') {
          for (const k of Object.keys(obj)) {
            const found = extractRegex(obj[k], regex);
            if (found) return found;
          }
        }
        return null;
      };

      if (!email) email = extractRegex(jobResult, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (!phone) phone = extractRegex(jobResult, /\+?\d[\d\s\-\(\)]{8,}/);

      const mappedData = {
        name: name,
        email: email,
        phone: phone ? String(phone) : null,
        skills: skills,
        experience: experienceNum,
        education: education
      };

      this.parsedData = this.normalizeNulls(mappedData);
      this.currentStep = 2; // Advance to review step
      this.showToast('Resume parsed successfully with ApyHub AI!', 'success');

    } catch (err: any) {
      console.error('ApyHub parse error:', err);
      this.showToast('Failed to parse Resume: ' + (err.message || err), 'error');
      // Fallback
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
  //  MAIN FLOW: UPLOAD → SAVE → FETCH  (Steps 3, 4, 5)
  // =====================================================================
  async processUploadAndSave() {
    if (!this.selectedFile || !this.parsedData) {
      this.showToast('Please upload a resume first.', 'error'); return;
    }
    if (!this.isApproved) {
      this.showToast('Please approve the parsed details before saving.', 'error'); return;
    }
    const candidateId = sessionStorage.getItem('candidate_id');
    if (!candidateId) {
      this.showToast('You must be logged in. Please login and try again.', 'error'); return;
    }

    this.isSaving = true;
    this.showToast('Uploading resume to server…', 'info');

    try {
      // --- Step 3: Convert to Base64 and upload ---
      this.currentStep = 3;
      const base64 = await this.fileToBase64(this.selectedFile);
      console.log(`Uploading: ${this.selectedFile.name} (${this.selectedFile.size} bytes, base64 len=${base64.length})`);

      const uploadResp = await this.heroService.uploadDocumentsRMS(this.selectedFile.name, base64);
      console.log('Upload response (XMLDocument):', uploadResp);

      // Extract path from the XML Document response
      let serverPath = '';
      if (uploadResp instanceof Document) {
        // Try to find the UploadDocuments_RMS element text
        const el = uploadResp.getElementsByTagName('UploadDocuments_RMS')[0];
        if (el) serverPath = el.textContent || '';
      }

      // Use the server path if found, otherwise fall back to original filename
      if (serverPath) {
        this.resumeFileName = this.bareFileName(serverPath);
      } else {
        console.warn('Could not extract path from response, using original filename.');
        this.resumeFileName = this.selectedFile.name;
      }

      console.log('Resume file name:', this.resumeFileName);
      this.showToast('File uploaded! Saving to profile…', 'info');

      // --- Step 4: Save resume_path + parsed fields ---
      this.currentStep = 4;
      const fields: any = {
        name:        this.parsedData.name || '',
        phone:       this.parsedData.phone || '',
        skills:      this.parsedData.skills || '',
        experience:  this.parsedData.experience ?? 0,
        education:   this.parsedData.education || '',
        resume_path: this.resumeFileName
      };
      await this.heroService.updateCandidate(candidateId, fields);

      // --- Step 5: Fetch updated candidate to verify ---
      const freshResp = await this.heroService.getCandidateObject(candidateId);
      console.log('Verified candidate:', freshResp);

      // Build the final candidate object for Step 6
      const candidateObj = this.heroService.xmltojson(freshResp, 'candidate');
      this.buildFinalOutput(candidateObj);

      // --- Step 6: Done ---
      this.currentStep = 5;
      this.showToast('Resume uploaded and saved successfully!', 'success');

      // Reload the page after a short delay so the user sees the success toast
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
      { label: 'Name',         value: ext(candidate.name) },
      { label: 'Email',        value: ext(candidate.email) },
      { label: 'Phone',        value: ext(candidate.phone) },
      { label: 'Skills',       value: ext(candidate.skills) },
      { label: 'Experience',   value: ext(candidate.experience) ? ext(candidate.experience) + ' years' : '' },
      { label: 'Education',    value: ext(candidate.education) },
      { label: 'Resume File',  value: ext(candidate.resume_path) }
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
