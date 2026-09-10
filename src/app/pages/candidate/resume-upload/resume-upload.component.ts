import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { Router } from '@angular/router';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to local assets
if (typeof window !== 'undefined') {
  try {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = './assets/js/pdf.worker.min.js';
  } catch (e) {
    console.warn('pdfjs worker configuration:', e);
  }
}


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
  private readonly DOWNLOAD_BASE = 'http://43.242.214.197:8081/home/Adnate/MAHINDRA_UPLOADS/Intern_Uploads';

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

    this.parseResume(file);
  }

  // =====================================================================
  //  RESUME PARSING (Step 1) - 100% Free & Local via pdfjs-dist
  // =====================================================================
  async parseResume(file: File) {
    this.isParsing = true;
    this.parsedData = null;
    this.currentStep = 1;

    try {
      this.showToast('Extracting resume details locally...', 'info');

      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        text = await this.extractTextFromPdf(file);
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Could not extract readable text from file. Please ensure it is a digital PDF or text file.');
      }

      const mappedData = {
        name: this.extractNameFromText(text),
        email: this.extractEmailFromText(text),
        phone: this.extractPhoneFromText(text),
        skills: this.extractSkillsFromText(text),
        experience: this.extractExperienceFromText(text),
        education: this.extractEducationFromText(text)
      };

      this.parsedData = this.normalizeNulls(mappedData);
      this.currentStep = 2;
      this.showToast('Resume parsed successfully!', 'success');

    } catch (err: any) {
      console.error('Resume parse error:', err);
      this.showToast('Failed to parse Resume: ' + (err.message || err), 'error');
      this.parsedData = { name: null, email: null, phone: null, skills: null, experience: null, education: null };
      this.currentStep = 2;
      this.isApproved = false;
    } finally {
      this.isParsing = false;
    }
  }

  // =====================================================================
  //  DOWNLOAD RESUME
  // =====================================================================
  isDownloading = false;

  getResumeDownloadUrl(): string {
    if (!this.resumeFileName) return '#';
    return `${this.DOWNLOAD_BASE}/${this.resumeFileName}`;
  }

  async downloadResume(): Promise<void> {
    if (!this.resumeFileName) {
      this.showToast('No active resume found to download.', 'error');
      return;
    }

    const fileName = this.bareFileName(this.resumeFileName);
    this.isDownloading = true;
    this.showToast(`Fetching resume (${fileName})...`, 'info');

    try {
      const base64 = await this.heroService.downloadDocumentRMS(fileName);
      if (!base64) {
        throw new Error('Resume content returned empty from server.');
      }
      this.heroService.openBase64Document(base64, fileName);
    } catch (err: any) {
      console.error('[ResumeUpload] downloadResume error:', err);
      // Fallback: try opening via HTTP URL
      const fallbackUrl = `${this.DOWNLOAD_BASE}/${fileName}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      this.isDownloading = false;
    }
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

  /**
   * Extracts text page-by-page from a PDF using pdfjs-dist, preserving line structure
   */
  private async extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = (pdfjsLib as any).getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        if (lastY === null || Math.abs(item.transform[5] - lastY) < 4) {
          currentLine += (currentLine ? ' ' : '') + item.str;
        } else {
          if (currentLine.trim()) pageLines.push(currentLine.trim());
          currentLine = item.str;
        }
        lastY = item.transform[5];
      }
      if (currentLine.trim()) pageLines.push(currentLine.trim());

      fullText += pageLines.join('\n') + '\n';
    }

    return fullText;
  }

  private extractNameFromText(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const ignoreWords = [
      'curriculum vitae', 'resume', 'cv', 'bio-data', 'biodata', 'profile',
      'contact', 'email', 'phone', 'address', 'summary', 'experience', 'education',
      'personal details', 'objective', 'skills', 'page', 'http', 'https', 'github', 'linkedin'
    ];

    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (ignoreWords.some(w => lower.includes(w))) continue;
      if (line.includes('@') || line.includes('.com') || line.includes('.in')) continue;
      if (/\d/.test(line)) continue;
      if (line.length < 3 || line.length > 35) continue;

      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 1 && words.length <= 4 && /^[a-zA-Z\s.'-]+$/.test(line)) {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }
    }
    return null;
  }

  private extractEmailFromText(text: string): string | null {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0].trim() : null;
  }

  private extractPhoneFromText(text: string): string | null {
    const matches = text.match(/(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{3,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}/g);
    if (!matches) return null;
    for (const raw of matches) {
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length >= 10 && digitsOnly.length <= 13) {
        return raw.trim();
      }
    }
    return null;
  }

  private extractExperienceFromText(text: string): number | null {
    const directPatterns = [
      /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:total|relevant)?\s*experience/i,
      /(?:total|relevant)?\s*experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i,
      /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*in\s+(?:software|development|engineering|it|testing|design)/i
    ];

    for (const pattern of directPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val >= 0 && val <= 50) {
          return Math.floor(val);
        }
      }
    }

    // Estimate from year ranges in work history
    const currentYear = new Date().getFullYear();
    const yearRangeRegex = /\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*(19\d{2}|20\d{2}|present|current)\b/gi;
    let match: RegExpExecArray | null;
    let minYear = currentYear;
    let hasRange = false;

    while ((match = yearRangeRegex.exec(text)) !== null) {
      const start = parseInt(match[1], 10);
      if (start >= 1970 && start <= currentYear) {
        hasRange = true;
        if (start < minYear) minYear = start;
      }
    }

    if (hasRange && minYear < currentYear) {
      const diff = currentYear - minYear;
      if (diff > 0 && diff <= 40) {
        return diff;
      }
    }

    return null;
  }

  private extractSkillsFromText(text: string): string | null {
    const skillList = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'PHP', 'Ruby', 'Go', 'Rust', 'Kotlin', 'Swift', 'Dart', 'R',
      'Angular', 'React', 'Vue', 'Next.js', 'Nuxt', 'Svelte', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Tailwind CSS', 'Tailwind',
      'Bootstrap', 'Sass', 'SCSS', 'Redux', 'RxJS', 'jQuery', 'Webpack', 'Vite',
      'Node.js', 'Express.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Hibernate',
      'ASP.NET', '.NET Core', '.NET', 'Laravel', 'Rails', 'Ruby on Rails', 'REST API', 'GraphQL', 'Microservices',
      'SQL', 'MySQL', 'PostgreSQL', 'Oracle', 'MongoDB', 'Redis', 'SQLite', 'MariaDB', 'Cassandra', 'DynamoDB', 'Firebase', 'Elasticsearch',
      'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI',
      'Terraform', 'Linux', 'Unix', 'Nginx', 'Apache',
      'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Data Science', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Power BI', 'Tableau',
      'Git', 'GitHub', 'GitLab', 'Jira', 'Postman', 'Jest', 'Jasmine', 'Karma', 'Cypress', 'Selenium', 'Agile', 'Scrum'
    ];

    const detected = new Set<string>();
    for (const skill of skillList) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, 'i');
      if (pattern.test(text)) {
        detected.add(skill);
      }
    }

    return detected.size > 0 ? Array.from(detected).join(', ') : null;
  }

  private extractEducationFromText(text: string): string | null {
    const degrees = [
      'B.Tech', 'Bachelor of Technology',
      'B.E.', 'Bachelor of Engineering',
      'M.Tech', 'Master of Technology',
      'M.E.', 'Master of Engineering',
      'BCA', 'Bachelor of Computer Applications',
      'MCA', 'Master of Computer Applications',
      'B.Sc', 'Bachelor of Science',
      'M.Sc', 'Master of Science',
      'B.Com', 'Bachelor of Commerce',
      'M.Com', 'Master of Commerce',
      'BBA', 'Bachelor of Business Administration',
      'MBA', 'Master of Business Administration',
      'Diploma', 'High School', '12th', '10th'
    ];

    const found: string[] = [];
    for (const deg of degrees) {
      const escaped = deg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, 'i');
      if (pattern.test(text)) {
        found.push(deg);
      }
    }

    if (found.length === 0) return null;
    return found.slice(0, 2).join(' / ');
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
