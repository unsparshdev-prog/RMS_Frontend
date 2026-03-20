import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeroService } from '../../hero.service';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-hr-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-panel.component.html',
  styleUrls: ['./hr-panel.component.css']
})
export class HrPanelComponent implements OnInit {
  isSidebarCollapsed = false;
  activeTab = 'Dashboard';

  // --- Job Requisition Form Model ---
  requisition = {
    job_title: '',
    department: 'Engineering',
    location: 'Remote',
    job_description: '',
    required_skills: '',
    min_experience: '',
    max_experience: '',
    salary_range: '',
    no_of_positions: '1',
    priority: 'Medium',
    status: 'PENDING',
    approval_status: 'Pending',
    closing_date: ''
  };
  isSubmittingRequisition = false;
  editingJobId: string | null = null;

  // Toast
  showToastMsg = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private heroService: HeroService, private auth: AuthService, private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.loadJobs();
    this.loadInterviewPanels();
  }

  logout(): void {
    this.auth.logout();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastMsg = true;
    setTimeout(() => {
      this.showToastMsg = false;
    }, 4000);
  }

  sidebarSections = [
    {
      title: 'Recruitment',
      items: [
        { name: 'Dashboard', icon: 'fas fa-th-large' },
        { name: 'Job Requisition', icon: 'fas fa-briefcase' },
        { name: 'Jobs', icon: 'fas fa-list' },
        { name: 'Interview Panel', icon: 'fas fa-user-tie' },
        { name: 'Scheduling', icon: 'far fa-calendar-alt' },
        { name: 'Candidate Pipeline', icon: 'fas fa-users' },
        { name: 'Offer Tracker', icon: 'fas fa-file-signature' }
      ]
    },
    {
      title: 'Screening & Evaluation',
      items: [
        { name: 'AI Screening', icon: 'fas fa-robot' },
        { name: 'Candidate Comparison', icon: 'fas fa-balance-scale' },
        { name: 'Evaluation Scorecards', icon: 'fas fa-clipboard-list' }
      ]
    },
    {
      title: 'Insights & Network',
      items: [
        { name: 'Referral Tracking', icon: 'fas fa-project-diagram' },
        { name: 'Analytics & Reports', icon: 'fas fa-chart-line' }
      ]
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Approval Chain', icon: 'fas fa-sitemap' }
      ]
    }
  ];

  // --- Interview Panel Data ---
  isLoadingPanels = false;
  interviewPanels: any[] = [];
  showAddPanelModal = false;
  showEditPanelModal = false;
  editingPanel: any = null;
  newPanelForm = {
    panel_id: '',
    interview_id: '',
    interviewer_id: '',
    interviewer_name: '',
    feedback: '',
    rating: '',
    task_id: '',
    temp1: '',
    temp2: '',
    temp3: '',
    temp4: '',
    temp5: ''
  };
  panelSearchQuery = '';

  get activePanelistCount() {
    return this.interviewPanels.filter(m => this.getExt(m.temp1) === 'active').length;
  }

  get inactivePanelistCount() {
    return this.interviewPanels.filter(m => this.getExt(m.temp1) === 'inactive').length;
  }

  get filteredInterviewPanels() {
    let filtered = this.interviewPanels;
    if (this.panelSearchQuery.trim()) {
      const q = this.panelSearchQuery.toLowerCase();
      filtered = this.interviewPanels.filter(m =>
        this.getExt(m.interviewer_name).toLowerCase().includes(q) ||
        this.getExt(m.interviewer_id).toLowerCase().includes(q) ||
        this.getExt(m.temp2).toLowerCase().includes(q) ||
        this.getExt(m.temp3).toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  // --- Pagination Logic ---
  interviewPanelCurrentPage = 1;
  interviewPanelPageSize = 5;

  get paginatedInterviewPanels() {
    const start = (this.interviewPanelCurrentPage - 1) * this.interviewPanelPageSize;
    return this.filteredInterviewPanels.slice(start, start + this.interviewPanelPageSize);
  }

  get interviewPanelTotalPages() {
    return Math.max(1, Math.ceil(this.filteredInterviewPanels.length / this.interviewPanelPageSize));
  }

  changeInterviewPanelPage(delta: number) {
    const newPage = this.interviewPanelCurrentPage + delta;
    if (newPage >= 1 && newPage <= this.interviewPanelTotalPages) {
      this.interviewPanelCurrentPage = newPage;
    }
  }

  onPanelSearchChange() {
    this.interviewPanelCurrentPage = 1;
  }

  async loadInterviewPanels() {
    this.isLoadingPanels = true;
    try {
      const resp = await this.heroService.getInterviewPanels();
      let data = this.heroService.xmltojson(resp, 'tuple');
      if (!data) data = this.heroService.xmltojson(resp, 'interview_panel');
      if (!data) data = [];
      const arr = Array.isArray(data) ? data : [data];
      this.interviewPanels = arr.map((t: any) => {
        const p = t.new?.interview_panel || t.old?.interview_panel || t.interview_panel || t;
        return { raw: p };
      }).filter((p: any) => p.raw && Object.keys(p.raw).length > 0);
      console.log('[HrPanel] Loaded interview panels:', this.interviewPanels);
    } catch (e) {
      console.error('[HrPanel] Error loading interview panels:', e);
      this.showToast('Failed to load interview panels.', 'error');
    } finally {
      this.isLoadingPanels = false;
    }
  }

  getExt(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (field.text) return field.text;
    if (field['#text']) return field['#text'];
    return String(field);
  }

  openAddPanelModal() {
    this.showAddPanelModal = true;
    this.newPanelForm = {
      panel_id: '', interview_id: '', interviewer_id: '', interviewer_name: '',
      feedback: '', rating: '', task_id: '', temp1: '', temp2: '', temp3: '', temp4: '', temp5: ''
    };
  }

  openEditPanelModal(panel: any) {
    this.editingPanel = panel;
    this.showEditPanelModal = true;
    this.newPanelForm = {
      panel_id: this.getExt(panel.raw?.panel_id),
      interview_id: this.getExt(panel.raw?.interview_id),
      interviewer_id: this.getExt(panel.raw?.interviewer_id),
      interviewer_name: this.getExt(panel.raw?.interviewer_name),
      feedback: this.getExt(panel.raw?.feedback),
      rating: this.getExt(panel.raw?.rating),
      task_id: this.getExt(panel.raw?.task_id),
      temp1: this.getExt(panel.raw?.temp1),
      temp2: this.getExt(panel.raw?.temp2),
      temp3: this.getExt(panel.raw?.temp3),
      temp4: this.getExt(panel.raw?.temp4),
      temp5: this.getExt(panel.raw?.temp5)
    };
  }

  closeAddPanelModal() {
    this.showAddPanelModal = false;
    this.showEditPanelModal = false;
    this.editingPanel = null;
  }

  async addPanelist() {
    if (!this.newPanelForm.panel_id || !this.newPanelForm.interviewer_id) {
      this.showToast('Panel ID and Interviewer ID are required.', 'error');
      return;
    }
    try {
      await this.heroService.createInterviewPanel({
        ...this.newPanelForm,
        created_at: new Date().toISOString(),
        created_by: sessionStorage.getItem('displayName') || 'HR'
      });
      this.showToast('Interview panel created successfully!', 'success');
      this.closeAddPanelModal();
      this.loadInterviewPanels();
    } catch (e) {
      console.error('Error creating interview panel:', e);
      this.showToast('Failed to create interview panel.', 'error');
    }
  }

  async updatePanelist() {
    if (!this.editingPanel) return;
    try {
      await this.heroService.updateInterviewPanel(this.editingPanel.raw, this.newPanelForm);
      this.showToast('Interview panel updated successfully!', 'success');
      this.closeAddPanelModal();
      this.loadInterviewPanels();
    } catch (e) {
      console.error('Error updating interview panel:', e);
      this.showToast('Failed to update interview panel.', 'error');
    }
  }

  async removePanelist(panel: any) {
    if (!confirm('Are you sure you want to remove this interview panel?')) return;
    try {
      await this.heroService.deleteInterviewPanel(panel.raw);
      this.showToast('Interview panel removed successfully!', 'success');
      this.loadInterviewPanels();
    } catch (e) {
      console.error('Error removing interview panel:', e);
      this.showToast('Failed to remove interview panel.', 'error');
    }
  }

  // --- Scheduling Data (Calendly-like) ---
  schedulingSubTab: 'event-types' | 'single-use' | 'meeting-polls' | 'teams-meeting' = 'event-types';
  schedulingSearchQuery = '';
  showCreateEventModal = false;

  eventTypes = [
    { id: 1, title: 'Technical Screening', duration: 45, type: 'One-on-One', availability: 'Weekdays, 9 am - 5 pm', color: '#0B2265', active: true },
    { id: 2, title: 'HR Round', duration: 30, type: 'One-on-One', availability: 'Weekdays, 10 am - 4 pm', color: '#F59E0B', active: true },
    { id: 3, title: 'System Design Interview', duration: 60, type: 'Group', availability: 'Weekdays, 9 am - 5 pm', color: '#10B981', active: true },
    { id: 4, title: 'Culture Fit Discussion', duration: 30, type: 'One-on-One', availability: 'Weekdays, 11 am - 3 pm', color: '#8B5CF6', active: true },
    { id: 5, title: 'Final Panel Interview', duration: 90, type: 'Group', availability: 'Mon, Wed, Fri — 2 pm - 5 pm', color: '#EF4444', active: false }
  ];

  newEvent = { title: '', duration: 30, type: 'One-on-One', availability: 'Weekdays, 9 am - 5 pm' };

  get filteredEventTypes() {
    if (!this.schedulingSearchQuery.trim()) return this.eventTypes;
    const q = this.schedulingSearchQuery.toLowerCase();
    return this.eventTypes.filter(e => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
  }

  copyEventLink(event: any) {
    // In a real app this would copy a link to clipboard
    this.showToast(`Link copied for: ${event.title}`, 'success');
  }

  toggleEventActive(event: any) {
    event.active = !event.active;
  }

  openCreateEventModal() {
    this.showCreateEventModal = true;
    this.newEvent = { title: '', duration: 30, type: 'One-on-One', availability: 'Weekdays, 9 am - 5 pm' };
  }

  closeCreateEventModal() {
    this.showCreateEventModal = false;
  }

  createEvent() {
    if (this.newEvent.title) {
      const colors = ['#0B2265', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#00C4F0', '#0088A8'];
      this.eventTypes.push({
        id: this.eventTypes.length + 1,
        title: this.newEvent.title,
        duration: this.newEvent.duration,
        type: this.newEvent.type,
        availability: this.newEvent.availability,
        color: colors[Math.floor(Math.random() * colors.length)],
        active: true
      });
      this.closeCreateEventModal();
    }
  }

  deleteEvent(id: number) {
    this.eventTypes = this.eventTypes.filter(e => e.id !== id);
  }

  // --- Teams Meeting (Demo) ---
  private readonly TEAMS_API = 'http://localhost:3001/api/teams/meeting';

  teamsMeeting = {
    subject: '',
    startTime: '',
    endTime: '',
    attendees: '' as string | string[]
  };
  isCreatingMeeting = false;
  teamsMeetingResult: { joinUrl: string; eventId: string } | null = null;

  scheduleTeamsMeeting() {
    if (!this.teamsMeeting.subject || !this.teamsMeeting.startTime || !this.teamsMeeting.endTime) {
      this.showToast('Please fill in Subject, Start Time, and End Time.', 'error');
      return;
    }

    const attendeesList = typeof this.teamsMeeting.attendees === 'string'
      ? this.teamsMeeting.attendees.split(',').map((e: string) => e.trim()).filter(Boolean)
      : this.teamsMeeting.attendees;

    if (attendeesList.length === 0) {
      this.showToast('Please add at least one attendee email.', 'error');
      return;
    }

    const payload = {
      subject: this.teamsMeeting.subject,
      startTime: new Date(this.teamsMeeting.startTime).toISOString(),
      endTime: new Date(this.teamsMeeting.endTime).toISOString(),
      attendees: attendeesList
    };

    this.isCreatingMeeting = true;
    this.teamsMeetingResult = null;

    this.http.post<any>(this.TEAMS_API, payload).subscribe({
      next: (res) => {
        this.teamsMeetingResult = { joinUrl: res.joinUrl, eventId: res.eventId };
        this.showToast('Teams meeting created successfully!', 'success');
        this.isCreatingMeeting = false;
      },
      error: (err) => {
        const detail = err.error?.detail || err.message || 'Unknown error';
        this.showToast(`Failed to create meeting: ${detail}`, 'error');
        this.isCreatingMeeting = false;
      }
    });
  }

  resetTeamsForm() {
    this.teamsMeeting = { subject: '', startTime: '', endTime: '', attendees: '' };
    this.teamsMeetingResult = null;
  }

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // --- Job Requisition Submit ---
  submitRequisition() {
    if (!this.requisition.job_title || !this.requisition.department) {
      this.showToast('Please fill in at least the Job Title and Department.', 'error');
      return;
    }

    this.isSubmittingRequisition = true;

    if (this.editingJobId) {
      // Setup payload with modified_at
      const updatedData = { ...this.requisition, modified_at: new Date().toISOString() };
      
      this.heroService.updateJobRequisition(this.editingJobId, updatedData)
        .then((response: any) => {
          console.log('Job Requisition updated successfully:', response);
          this.showToast('Job Requisition updated successfully!', 'success');
          this.resetRequisitionForm();
          this.loadJobs(); // Refresh table
        })
        .catch((error: any) => {
          console.error('Error updating job requisition:', error);
          this.showToast('Failed to update job requisition. Please try again.', 'error');
        })
        .finally(() => {
          this.isSubmittingRequisition = false;
        });
    } else {
      // Create new
      this.heroService.createJobRequisition(this.requisition)
        .then((response: any) => {
          console.log('Job Requisition created successfully:', response);
          this.showToast('Job Requisition submitted successfully!', 'success');
          this.resetRequisitionForm();
          this.loadJobs(); // Refresh table
        })
        .catch((error: any) => {
          console.error('Error creating job requisition:', error);
          this.showToast('Failed to submit job requisition. Please try again.', 'error');
        })
        .finally(() => {
          this.isSubmittingRequisition = false;
        });
    }
  }

  resetRequisitionForm() {
    this.requisition = {
      job_title: '',
      department: 'Engineering',
      location: 'Remote',
      job_description: '',
      required_skills: '',
      min_experience: '',
      max_experience: '',
      salary_range: '',
      no_of_positions: '1',
      priority: 'Medium',
      status: 'PENDING',
      approval_status: 'Pending',
      closing_date: ''
    };
    this.editingJobId = null;
  }

  // --- Candidate Pipeline ---
  pipelineStages = [
    { id: 'applied', name: 'Applied', icon: 'fas fa-inbox', color: '#0B2265' },
    { id: 'screened', name: 'Screened', icon: 'fas fa-filter', color: '#2F4B8F' },
    { id: 'interviewing', name: 'Interviewing', icon: 'fas fa-comments', color: '#0088A8' },
    { id: 'offered', name: 'Offered', icon: 'fas fa-file-signature', color: '#00C4F0' },
    { id: 'joined', name: 'Joined', icon: 'fas fa-check-circle', color: '#10B981' }
  ];

  candidates: any[] = [
    { id: 1, name: 'Aarav Mehta', role: 'Senior Frontend Developer', department: 'Engineering', avatar: 'AM', stage: 'applied', appliedDate: '2026-03-10', score: 87, skills: ['Angular', 'TypeScript', 'CSS'], email: 'aarav.m@example.com', phone: '+91 98765 43210', experience: '5 years' },
    { id: 2, name: 'Diya Sharma', role: 'Product Designer', department: 'Design', avatar: 'DS', stage: 'applied', appliedDate: '2026-03-12', score: 92, skills: ['Figma', 'UI/UX', 'Prototyping'], email: 'diya.s@example.com', phone: '+91 87654 32109', experience: '4 years' },
    { id: 3, name: 'Rohan Patel', role: 'Backend Engineer', department: 'Engineering', avatar: 'RP', stage: 'screened', appliedDate: '2026-03-05', score: 78, skills: ['Java', 'Microservices', 'SQL'], email: 'rohan.p@example.com', phone: '+91 76543 21098', experience: '3 years' },
    { id: 4, name: 'Ananya Gupta', role: 'QA Analyst', department: 'Engineering', avatar: 'AG', stage: 'screened', appliedDate: '2026-03-08', score: 81, skills: ['Selenium', 'JIRA', 'API Testing'], email: 'ananya.g@example.com', phone: '+91 65432 10987', experience: '2 years' },
    { id: 5, name: 'Vikram Singh', role: 'DevOps Engineer', department: 'Engineering', avatar: 'VS', stage: 'interviewing', appliedDate: '2026-02-28', score: 90, skills: ['Docker', 'K8s', 'AWS'], email: 'vikram.s@example.com', phone: '+91 54321 09876', experience: '6 years' },
    { id: 6, name: 'Priya Nair', role: 'HR Coordinator', department: 'HR & Ops', avatar: 'PN', stage: 'interviewing', appliedDate: '2026-03-01', score: 85, skills: ['Recruitment', 'Onboarding', 'Compliance'], email: 'priya.n@example.com', phone: '+91 43210 98765', experience: '3 years' },
    { id: 7, name: 'Karthik Rao', role: 'Data Analyst', department: 'Product', avatar: 'KR', stage: 'offered', appliedDate: '2026-02-20', score: 94, skills: ['Python', 'SQL', 'Tableau'], email: 'karthik.r@example.com', phone: '+91 32109 87654', experience: '4 years' },
    { id: 8, name: 'Meera Joshi', role: 'Full Stack Developer', department: 'Engineering', avatar: 'MJ', stage: 'applied', appliedDate: '2026-03-14', score: 76, skills: ['React', 'Node.js', 'MongoDB'], email: 'meera.j@example.com', phone: '+91 21098 76543', experience: '2 years' }
  ];

  pipelineSearchQuery = '';
  selectedCandidate: any = null;
  showKanbanModal = false;

  // Drag & drop state
  draggedCandidate: any = null;
  dragOverStage: string = '';

  // Confirmation popup
  showConfirmModal = false;
  pendingMove: { candidate: any; fromStage: string; toStage: string } | null = null;

  get filteredCandidates() {
    if (!this.pipelineSearchQuery.trim()) return this.candidates;
    const q = this.pipelineSearchQuery.toLowerCase();
    return this.candidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.skills.some((s: string) => s.toLowerCase().includes(q))
    );
  }

  get activeCandidates() {
    return this.filteredCandidates.filter(c => c.stage !== 'joined');
  }

  getCandidatesByStage(stageId: string) {
    return this.candidates.filter(c => c.stage === stageId);
  }

  getStageName(stageId: string): string {
    const stage = this.pipelineStages.find(s => s.id === stageId);
    return stage ? stage.name : stageId;
  }

  getStageColor(stageId: string): string {
    const stage = this.pipelineStages.find(s => s.id === stageId);
    return stage ? stage.color : '#64748B';
  }

  openKanbanModal(candidate: any) {
    this.selectedCandidate = candidate;
    this.showKanbanModal = true;
  }

  closeKanbanModal() {
    this.showKanbanModal = false;
    this.selectedCandidate = null;
  }

  // --- Drag & Drop ---
  onDragStart(event: DragEvent, candidate: any) {
    this.draggedCandidate = candidate;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', candidate.id.toString());
    }
  }

  onDragOver(event: DragEvent, stageId: string) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverStage = stageId;
  }

  onDragLeave(event: DragEvent, stageId: string) {
    // Only clear if we truly left (not entering a child)
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      this.dragOverStage = '';
    }
  }

  onDrop(event: DragEvent, toStageId: string) {
    event.preventDefault();
    this.dragOverStage = '';
    if (this.draggedCandidate && this.draggedCandidate.stage !== toStageId) {
      this.pendingMove = {
        candidate: this.draggedCandidate,
        fromStage: this.draggedCandidate.stage,
        toStage: toStageId
      };
      this.showConfirmModal = true;
    }
    this.draggedCandidate = null;
  }

  onDragEnd() {
    this.draggedCandidate = null;
    this.dragOverStage = '';
  }

  confirmMove() {
    if (this.pendingMove) {
      this.pendingMove.candidate.stage = this.pendingMove.toStage;
      this.pendingMove = null;
    }
    this.showConfirmModal = false;
  }

  cancelMove() {
    this.pendingMove = null;
    this.showConfirmModal = false;
  }

  // --- Candidate Comparison ---
  comparatorList: any[] = [];
  showComparatorModal = false;
  comparisonSearchQuery = '';

  get filteredComparisonCandidates() {
    if (!this.comparisonSearchQuery.trim()) return this.activeCandidates;
    const q = this.comparisonSearchQuery.toLowerCase();
    return this.activeCandidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  }

  addToComparator(candidate: any) {
    if (this.comparatorList.length >= 4) {
      this.showToast('You can compare up to 4 candidates at a time.', 'error');
      return;
    }
    if (!this.comparatorList.some(c => c.id === candidate.id)) {
      this.comparatorList.push(candidate);
    }
  }

  removeFromComparator(id: number) {
    this.comparatorList = this.comparatorList.filter(c => c.id !== id);
  }

  openComparator() {
    if (this.comparatorList.length < 2) {
      this.showToast('Please add at least 2 candidates to compare.', 'error');
      return;
    }
    this.showComparatorModal = true;
  }

  closeComparator() {
    this.showComparatorModal = false;
  }

  // --- Referral Tracking ---
  referralSearchQuery = '';
  employees = [
    { id: 'E001', name: 'Rajesh Kumar', department: 'Engineering', role: 'Engineering Manager', avatar: 'RK', referralCount: 5, successfulReferrals: 2 },
    { id: 'E002', name: 'Priya Sharma', department: 'Engineering', role: 'Senior Developer', avatar: 'PS', referralCount: 3, successfulReferrals: 1 },
    { id: 'E003', name: 'Amit Verma', department: 'Engineering', role: 'Tech Lead', avatar: 'AV', referralCount: 8, successfulReferrals: 4 },
    { id: 'E004', name: 'Sneha Patel', department: 'HR & Ops', role: 'HR Business Partner', avatar: 'SP', referralCount: 1, successfulReferrals: 0 },
    { id: 'E005', name: 'Vikram Joshi', department: 'Product', role: 'Product Manager', avatar: 'VJ', referralCount: 0, successfulReferrals: 0 },
    { id: 'E006', name: 'Neha Gupta', department: 'Design', role: 'Design Lead', avatar: 'NG', referralCount: 4, successfulReferrals: 2 },
    { id: 'E007', name: 'Ravi Singh', department: 'Marketing', role: 'Marketing Head', avatar: 'RS', referralCount: 2, successfulReferrals: 1 },
    { id: 'E008', name: 'Kavita Menon', department: 'Sales', role: 'Sales Executive', avatar: 'KM', referralCount: 6, successfulReferrals: 3 }
  ];

  get filteredEmployees() {
    if (!this.referralSearchQuery.trim()) return this.employees;
    const q = this.referralSearchQuery.toLowerCase();
    return this.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }

  get totalReferrals() {
    return this.employees.reduce((acc, curr) => acc + curr.referralCount, 0);
  }

  get totalSuccessfulHires() {
    return this.employees.reduce((acc, curr) => acc + curr.successfulReferrals, 0);
  }

  // --- Jobs List ---
  jobsSearchQuery = '';
  isLoadingJobs = false;
  jobsList: any[] = [];

  async loadJobs() {
    this.isLoadingJobs = true;
    try {
      const resp = await this.heroService.showAllJobRequisition();
      
      let jobData = this.heroService.xmltojson(resp, 'job_requisition');
      if (!jobData) {
         jobData = this.heroService.xmltojson(resp, 'tuple');
      }

      if (jobData) {
        const jobsArray = Array.isArray(jobData) ? jobData : [jobData];
        
        const ext = (field: any) => {
          if (!field) return '';
          if (typeof field === 'string') return field;
          if (field.text) return field.text;
          if (field['#text']) return field['#text'];
          return String(field);
        };

        this.jobsList = jobsArray.map((j: any) => {
          const record = j.old?.job_requisition || j.new?.job_requisition || j.job_requisition || j;
          return {
            id: ext(record.requisition_id) || ext(record.id) || 'N/A',
            title: ext(record.job_title),
            department: ext(record.department),
            location: ext(record.location) || 'Remote',
            status: ext(record.status) || 'Open',
            applicants: 0, 
            datePosted: ext(record.closing_date),
            raw: record
          };
        });
        
        // Sort newest first based on ID (assuming sequential)
        this.jobsList.sort((a, b) => {
          const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
          const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
          return idB - idA;
        });
      }
      console.log('[HrPanel] Loaded jobs:', this.jobsList);
    } catch (e) {
      console.error('[HrPanel] Error loading jobs:', e);
      this.showToast('Failed to load jobs from server.', 'error');
    } finally {
      this.isLoadingJobs = false;
    }
  }

  editJob(job: any) {
    if (!job.raw) return;
    this.editingJobId = job.id;
    this.activeTab = 'Job Requisition';
    
    // Fill form safely
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    this.requisition = {
      job_title: ext(job.raw.job_title),
      department: ext(job.raw.department) || 'Engineering',
      location: ext(job.raw.location) || 'Remote',
      job_description: ext(job.raw.job_description),
      required_skills: ext(job.raw.required_skills),
      min_experience: ext(job.raw.min_experience),
      max_experience: ext(job.raw.max_experience),
      salary_range: ext(job.raw.salary_range),
      no_of_positions: ext(job.raw.no_of_positions) || '1',
      priority: ext(job.raw.priority) || 'Medium',
      status: ext(job.raw.status) || 'Open',
      approval_status: ext(job.raw.approval_status) || 'Pending',
      closing_date: ext(job.raw.closing_date)
    };
    this.showToast(`Switched to editing mode for ${job.title}`, 'success');
  }

  deleteJob(job: any) {
    if (confirm(`Are you sure you want to mark '${job.title}' as INACTIVE?`)) {
      if (!job.raw) return;
      
      const ext = (field: any) => field?.text || field?.['#text'] || field || '';
      const updatedData = {
        job_title: ext(job.raw.job_title),
        department: ext(job.raw.department),
        location: ext(job.raw.location),
        job_description: ext(job.raw.job_description),
        required_skills: ext(job.raw.required_skills),
        min_experience: ext(job.raw.min_experience),
        max_experience: ext(job.raw.max_experience),
        salary_range: ext(job.raw.salary_range),
        no_of_positions: ext(job.raw.no_of_positions),
        priority: ext(job.raw.priority),
        approval_status: ext(job.raw.approval_status),
        closing_date: ext(job.raw.closing_date),
        status: 'INACTIVE', // Mutating status
        modified_at: new Date().toISOString()
      };

      this.isLoadingJobs = true;
      this.heroService.updateJobRequisition(job.id, updatedData)
        .then(() => {
          this.showToast(`Job ${job.title} marked as INACTIVE.`, 'success');
          this.loadJobs(); // Refresh table
        })
        .catch((error: any) => {
          console.error('Error disabling job requisition:', error);
          this.showToast('Failed to mark job as INACTIVE.', 'error');
          this.isLoadingJobs = false; 
        });
    }
  }

  get filteredJobs() {
    let filtered = this.jobsList;
    if (this.jobsSearchQuery.trim()) {
      const q = this.jobsSearchQuery.toLowerCase();
      filtered = this.jobsList.filter(j => 
        j.title.toLowerCase().includes(q) || 
        j.department.toLowerCase().includes(q) ||
        j.status.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  // --- Pagination Logic for Jobs ---
  jobsCurrentPage = 1;
  jobsPageSize = 5;

  get paginatedJobs() {
    const start = (this.jobsCurrentPage - 1) * this.jobsPageSize;
    return this.filteredJobs.slice(start, start + this.jobsPageSize);
  }

  get jobsTotalPages() {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.jobsPageSize));
  }

  changeJobsPage(delta: number) {
    const newPage = this.jobsCurrentPage + delta;
    if (newPage >= 1 && newPage <= this.jobsTotalPages) {
      this.jobsCurrentPage = newPage;
    }
  }

  onJobsSearchChange() {
    this.jobsCurrentPage = 1;
  }
}

