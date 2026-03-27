import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeroService } from '../../hero.service';
import { AuthService } from '../../auth.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-hr-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-panel.component.html',
  styleUrls: ['./hr-panel.component.css']
})
export class HrPanelComponent implements OnInit {

  protected Math = Math;
  isSidebarCollapsed = false;
  activeTab = 'Dashboard';
  isGeneratingReport = false;
  currentDate = new Date();

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
    approval_status: 'PENDING',
    closing_date: ''
  };
  isSubmittingRequisition = false;
  editingJobId: string | null = null;

  // Toast
  showToastMsg = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  loggedInAdminName = 'HR';
  loggedInAdminFullName = 'HR Admin';
  loggedInAdminInitial = 'H';

  constructor(private heroService: HeroService, private auth: AuthService, private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.resolveLoggedInUser();
    this.loadJobs();
    this.loadInterviewPanels();
    this.loadCandidates();
    this.loadInterviewsAndPanels();
    this.loadReferrals();
    this.loadOfferedApplications();
  }

  async resolveLoggedInUser() {
    let emailOrId = '';
    if (typeof sessionStorage !== 'undefined') {
      emailOrId = sessionStorage.getItem('displayName') || '';
    }
    if (!emailOrId) return;

    // Use fallback first
    this.loggedInAdminFullName = emailOrId;
    this.loggedInAdminName = emailOrId.split('@')[0]; // Quick fallback for emails
    this.loggedInAdminInitial = this.loggedInAdminName.charAt(0).toUpperCase();

    try {
      const resp = await this.heroService.getEmployees();
      let arr = this.heroService.xmltojson(resp, 'employee');
      if (!arr) return;
      if (!Array.isArray(arr)) arr = [arr];

      const me = arr.find((e: any) => 
        (e.email || '').toLowerCase() === emailOrId.toLowerCase() ||
        (this.getExt(e.employee_id) || '').toLowerCase() === emailOrId.toLowerCase() ||
        (e.employee_name || '').toLowerCase() === emailOrId.toLowerCase()
      );

      if (me && me.employee_name) {
        this.loggedInAdminFullName = me.employee_name;
        this.loggedInAdminName = me.employee_name.split(' ')[0];
        this.loggedInAdminInitial = this.loggedInAdminName.charAt(0).toUpperCase();
      }
    } catch (e) {
      console.warn('Could not resolve logged in HR name via getEmployees', e);
    }
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

  // --- Dynamic Dashboard Data ---
  get dashboardOpenPositions(): number {
    return this.jobsList.filter(j => ['OPEN', 'ACTIVE', 'APPROVED'].includes(j.status?.toUpperCase())).length;
  }

  get dashboardActiveCandidates(): number {
    return this.candidates.filter(c => !['rejected', 'joined', 'revoked', 'withdrawn'].includes(c.stage)).length;
  }

  get dashboardPendingApprovals(): number {
    return this.jobsList.filter(j => j.status?.toUpperCase() === 'PENDING').length;
  }

  get dashboardTimeToHire(): string {
    return '18d';
  }

  get funnelAppliedCount() { return this.candidates.filter(c => c.stage === 'applied' || c.stage === 'rejected').length; }
  get funnelScreenedCount() { return this.candidates.filter(c => !['applied', 'rejected', 'revoked', 'withdrawn'].includes(c.stage)).length; }
  get funnelInterviewingCount() { return this.candidates.filter(c => ['interviewing', 'offered', 'joined'].includes(c.stage)).length; }
  get funnelOfferedCount() { return this.candidates.filter(c => ['offered', 'joined'].includes(c.stage)).length; }
  get funnelJoinedCount() { return this.candidates.filter(c => c.stage === 'joined').length; }

  get funnelAppliedWidth() { return 100; }
  get funnelScreenedWidth() { return this.funnelAppliedCount ? Math.max(15, (this.funnelScreenedCount / this.funnelAppliedCount) * 100) : 0; }
  get funnelInterviewingWidth() { return this.funnelAppliedCount ? Math.max(15, (this.funnelInterviewingCount / this.funnelAppliedCount) * 100) : 0; }
  get funnelOfferedWidth() { return this.funnelAppliedCount ? Math.max(15, (this.funnelOfferedCount / this.funnelAppliedCount) * 100) : 0; }
  get funnelJoinedWidth() { return this.funnelAppliedCount ? Math.max(15, (this.funnelJoinedCount / this.funnelAppliedCount) * 100) : 0; }

  get overdueInterviewsCount() {
    const today = new Date().toISOString().split('T')[0];
    return this.allInterviews.filter(i => (i.status === 'SCHEDULED' || i.status === 'PENDING') && i.scheduled_date && i.scheduled_date < today).length;
  }

  get pendingOffersCount() {
    return this.candidates.filter(c => c.stage === 'offered').length;
  }

  get aiScreeningReadyCount() {
    return this.candidates.filter(c => c.stage === 'applied').length;
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
        { name: 'Candidate Comparison', icon: 'fas fa-balance-scale' }
      ]
    },
    {
      title: 'Insights & Network',
      items: [
        { name: 'Referral Tracking', icon: 'fas fa-project-diagram' }
      ]
    }
  ];

  // --- Interview Panel Data ---
  isLoadingPanels = false;
  interviewPanels: any[] = [];
  showAddPanelModal = false;
  showEditPanelModal = false;
  editingPanel: any = null;
  newPanelForm: any = {
    panel_id: '',
    interview_id: '',
    interviewer_id: '',
    interviewer_name: '',
    feedback: '',
    rating: ''
  };
  panelSearchQuery = '';

  // --- New Interview Form Data ---
  employeesList: any[] = [];
  jobCandidates: any[] = [];
  selectedJobId: string = '';
  selectedCandidateIds: string[] = [];
  selectedInterviewerIds: string[] = [];
  isLoadingEmployees = false;
  interviewSchedule = {
    round: 'Round 1',
    scheduled_date: '',
    scheduled_time: '',
    meeting_link: ''
  };
  isSubmittingInterview = false;

  get activePanelistCount() {
    return this.interviewPanels.filter(m => this.getExt(m.temp1).toLowerCase() === 'accepted').length;
  }

  get inactivePanelistCount() {
    return this.interviewPanels.filter(m => this.getExt(m.temp1).toLowerCase() === 'pending').length;
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

  get groupedInterviewPanels() {
    const groups: { [key: string]: any[] } = {};
    // Grouping filtered panels by interview_id
    for (const panel of this.filteredInterviewPanels) {
      const iId = this.getExt(panel.raw?.interview_id) || 'Unknown Interview';
      if (!groups[iId]) {
        groups[iId] = [];
      }
      groups[iId].push(panel);
    }
    // Return an array of grouped objects
    return Object.keys(groups).map(key => ({
      interview_id: key,
      panels: groups[key]
    }));
  }

  get paginatedGroupedPanels() {
    const start = (this.interviewPanelCurrentPage - 1) * this.interviewPanelPageSize;
    return this.groupedInterviewPanels.slice(start, start + this.interviewPanelPageSize);
  }

  get interviewPanelTotalPages() {
    return Math.max(1, Math.ceil(this.groupedInterviewPanels.length / this.interviewPanelPageSize));
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
      feedback: '', rating: ''
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
      rating: this.getExt(panel.raw?.rating)
    };
  }

  closeAddPanelModal() {
    this.showAddPanelModal = false;
    this.showEditPanelModal = false;
    this.editingPanel = null;
    // Reset new interview form
    this.selectedJobId = '';
    this.selectedCandidateIds = [];
    this.selectedInterviewerIds = [];
    this.jobCandidates = [];
    this.interviewSchedule = {
      round: 'Round 1',
      scheduled_date: '',
      scheduled_time: '',
      meeting_link: ''
    };
  }

  getJobTitleById(jrId: string): string {
    const job = this.jobsList.find(j => j.jr_id === jrId);
    return job ? job.job_title : '';
  }

  async openAddPanelModalWithInterview() {
    this.showAddPanelModal = true;
    this.selectedJobId = '';
    this.selectedCandidateIds = [];
    this.selectedInterviewerIds = [];
    this.jobCandidates = [];
    this.interviewSchedule = {
      round: 'Round 1',
      scheduled_date: '',
      scheduled_time: '',
      meeting_link: ''
    };
    
    // Load jobs and employees in parallel
    await Promise.all([
      this.loadJobsForInterview(),
      this.loadEmployeesForInterview()
    ]);
  }

  async loadJobsForInterview() {
    try {
      const resp = await this.heroService.getJobRequisitions();
      const jobData = this.heroService.xmltojson(resp, 'job_requisition');
      const jobsArray = jobData ? (Array.isArray(jobData) ? jobData : [jobData]) : [];
      
      const ext = (field: any) => field?.text || field?.['#text'] || field || '';
      
      this.jobsList = jobsArray.map((j: any) => {
        const record = j.old || j.new || j;
        return {
          jr_id: ext(record.jr_id),
          job_title: ext(record.job_title),
          department: ext(record.department),
          location: ext(record.location),
          status: ext(record.status),
          raw: record
        };
      }).filter((j: any) => j.jr_id);
      
      console.log('[HrPanel] Loaded jobs for interview:', this.jobsList);
    } catch (e) {
      console.error('[HrPanel] Error loading jobs:', e);
    }
  }

  async loadEmployeesForInterview() {
    this.isLoadingEmployees = true;
    try {
      const resp = await this.heroService.getEmployees();
      const empData = this.heroService.xmltojson(resp, 'tuple');
      const empArray = empData ? (Array.isArray(empData) ? empData : [empData]) : [];
      
      const ext = (field: any) => field?.text || field?.['#text'] || field || '';
      
      this.employeesList = empArray.map((e: any) => {
        const record = e.old?.employee || e.new?.employee || e.employee || e;
        return {
          employee_id: ext(record.employee_id),
          employee_name: ext(record.employee_name),
          email: ext(record.email),
          department: ext(record.department),
          designation: ext(record.designation),
          raw: record
        };
      }).filter((e: any) => e.employee_id);
      
      console.log('[HrPanel] Loaded employees:', this.employeesList);
    } catch (e) {
      console.error('[HrPanel] Error loading employees:', e);
    } finally {
      this.isLoadingEmployees = false;
    }
  }

  async onJobSelectForInterview() {
    if (!this.selectedJobId) {
      this.jobCandidates = [];
      this.selectedCandidateIds = [];
      return;
    }
    
    this.isLoadingCandidates = true;
    try {
      const resp = await this.heroService.getCandidatesForJob(this.selectedJobId);
      const appData = this.heroService.xmltojson(resp, 'tuple');
      const appArray = appData ? (Array.isArray(appData) ? appData : [appData]) : [];
      
      const ext = (field: any) => field?.text || field?.['#text'] || field || '';
      
      this.jobCandidates = appArray.map((a: any) => {
        const record = a.old?.candidate_job_application || a.new?.candidate_job_application || a.candidate_job_application || a;
        const name = ext(record.candidate_name) || ext(record.candidate_id) || 'Unknown';
        const nameParts = name.split(' ');
        const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        
        return {
          application_id: ext(record.application_id),
          candidate_id: ext(record.candidate_id),
          candidate_name: name,
          avatar: initials,
          applied_date: ext(record.applied_date),
          status: ext(record.application_status),
          stage: ext(record.stage),
          raw: record
        };
      }).filter((c: any) => c.application_id);
      
      this.selectedCandidateIds = [];
      console.log('[HrPanel] Loaded candidates for job:', this.jobCandidates);
    } catch (e) {
      console.error('[HrPanel] Error loading candidates for job:', e);
      this.showToast('Failed to load candidates for selected job.', 'error');
    } finally {
      this.isLoadingCandidates = false;
    }
  }

  toggleCandidateSelection(candidateId: string) {
    const index = this.selectedCandidateIds.indexOf(candidateId);
    if (index > -1) {
      this.selectedCandidateIds.splice(index, 1);
    } else {
      this.selectedCandidateIds.push(candidateId);
    }
  }

  isCandidateSelected(candidateId: string): boolean {
    return this.selectedCandidateIds.includes(candidateId);
  }

  toggleInterviewerSelection(employeeId: string, employeeName: string) {
    const index = this.selectedInterviewerIds.indexOf(employeeId);
    if (index > -1) {
      this.selectedInterviewerIds.splice(index, 1);
    } else {
      this.selectedInterviewerIds.push(employeeId);
    }
  }

  isInterviewerSelected(employeeId: string): boolean {
    return this.selectedInterviewerIds.includes(employeeId);
  }

  async createInterviews() {
    // Validation
    if (!this.selectedJobId) {
      this.showToast('Please select a job.', 'error');
      return;
    }
    if (this.selectedCandidateIds.length === 0) {
      this.showToast('Please select at least one candidate.', 'error');
      return;
    }
    if (this.selectedInterviewerIds.length === 0) {
      this.showToast('Please select at least one interviewer.', 'error');
      return;
    }
    if (!this.interviewSchedule.scheduled_date || !this.interviewSchedule.scheduled_time) {
      this.showToast('Please provide scheduled date and time.', 'error');
      return;
    }

    this.isSubmittingInterview = true;
    let successCount = 0;
    let errorCount = 0;

    try {
      // For each selected candidate, create an interview and link all interviewers
      for (const candidateId of this.selectedCandidateIds) {
        try {
          // Create interview
          const interviewResp = await this.heroService.createInterview({
            candidate_id: candidateId,
            jr_id: this.selectedJobId,
            round: this.interviewSchedule.round,
            scheduled_date: this.interviewSchedule.scheduled_date,
            scheduled_time: this.interviewSchedule.scheduled_time,
            meeting_link: this.interviewSchedule.meeting_link,
            status: 'SCHEDULED'
          });

          // Extract the created interview_id from response
          const interviewId = this.heroService.xmltojson(interviewResp, 'interview_id');
          
          if (!interviewId) {
            console.warn('[HrPanel] No interview_id returned for candidate:', candidateId);
            errorCount++;
            continue;
          }

          // Create interview panel for each selected interviewer
          for (const interviewerId of this.selectedInterviewerIds) {
            const interviewer = this.employeesList.find(e => e.employee_id === interviewerId);
            const interviewerName = interviewer?.employee_name || interviewerId;

            await this.heroService.createInterviewPanel({
              interview_id: interviewId,
              interviewer_id: interviewerId,
              interviewer_name: interviewerName,
              feedback: '',
              rating: '',
              temp1: 'pending'
            });
          }

          // Call BPM EmployeeTaskBPM for each interviewer
          for (const interviewerId of this.selectedInterviewerIds) {
            try {
              await this.heroService.initiateEmployeeTaskBPM(interviewerId);
              console.log('[HrPanel] BPM task initiated for interviewer:', interviewerId);
            } catch (bpmErr) {
              console.warn('[HrPanel] BPM task initiation failed for interviewer:', interviewerId, bpmErr);
              // Don't fail the whole flow if BPM task fails
            }
          }

          // Update candidate application stage to 'interviewing'
          const candidate = this.jobCandidates.find(c => c.candidate_id === candidateId);
          if (candidate?.raw) {
            try {
              await this.heroService.updateCandidateApplication(
                candidate.raw,
                { application_status: 'IN_PROGRESS', stage: 'interviewing' }
              );
            } catch (stageErr) {
              console.warn('[HrPanel] Failed to update candidate stage:', stageErr);
            }
          }

          successCount++;
        } catch (e) {
          console.error('[HrPanel] Error creating interview for candidate:', candidateId, e);
          errorCount++;
        }
      }

      if (successCount > 0) {
        this.showToast(`Successfully created ${successCount} interview(s)!`, 'success');
        this.closeAddPanelModal();
        this.loadInterviewPanels();
        this.loadCandidates();
      } else {
        this.showToast('Failed to create interviews. Please try again.', 'error');
      }
    } catch (e) {
      console.error('[HrPanel] Error in createInterviews:', e);
      this.showToast('Failed to create interviews. Please try again.', 'error');
    } finally {
      this.isSubmittingInterview = false;
    }
  }

  async addPanelist() {
    if (!this.newPanelForm.interviewer_id) {
      this.showToast('Interviewer ID is required.', 'error');
      return;
    }
    try {
      await this.heroService.createInterviewPanel({
        ...this.newPanelForm,
        temp1: 'pending',
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
  private readonly TEAMS_API = '/api/teams/meeting';

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

  isLoadingCandidates = false;
  candidates: any[] = [];

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
    return this.filteredCandidates.filter(c => !['joined', 'revoked', 'withdrawn'].includes(c.stage));
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
      event.dataTransfer.setData('text/plain', candidate.application_id?.toString() || '');
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

  async loadCandidates() {
    this.isLoadingCandidates = true;
    try {
      const [candidatesResp, applicationsResp] = await Promise.all([
        this.heroService.getCandidates(),
        this.heroService.getCandidateJobApplications() // Use new WS to fetch temp1/temp2 dynamically
      ]);

      const candidatesData = this.heroService.xmltojson(candidatesResp, 'tuple');
      const applicationsData = this.heroService.xmltojson(applicationsResp, 'tuple');

      const candidatesArr = candidatesData ? (Array.isArray(candidatesData) ? candidatesData : [candidatesData]) : [];
      const applicationsArr = applicationsData ? (Array.isArray(applicationsData) ? applicationsData : [applicationsData]) : [];

      const candidateMap = new Map<string, any>();
      candidatesArr.forEach((t: any) => {
        const c = t.old?.candidate || t.new?.candidate || t.candidate || t;
        if (c && c.candidate_id) {
          const ext = (field: any) => field?.text || field?.['#text'] || field || '';
          candidateMap.set(ext(c.candidate_id), c);
        }
      });

      const ext = (field: any) => field?.text || field?.['#text'] || field || '';

      this.candidates = applicationsArr.map((t: any) => {
        const app = t.old?.candidate_job_application || t.new?.candidate_job_application || t.candidate_job_application || t;
        const candidateId = ext(app.candidate_id);
        const candidate = candidateMap.get(candidateId) || {};

        const stage = ext(app.stage) || 'applied';
        const name = ext(app.candidate?.temp1) || ext(candidate.name) || ext(candidate.candidate_name) || `Candidate ${candidateId}`;
        const nameParts = name.split(' ');
        const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

        const skillsStr = ext(candidate.skills) || '';
        const skills = skillsStr ? skillsStr.split(',').map((s: string) => s.trim()) : [];

        return {
          application_id: ext(app.application_id),
          candidate_id: candidateId,
          name: name,
          avatar: initials,
          role: ext(app.job_requisition?.temp2) || ext(candidate.designation) || ext(candidate.position) || 'Not specified',
          department: ext(app.department) || ext(candidate.department) || 'General',
          stage: stage.toLowerCase(),
          appliedDate: ext(app.applied_date) || ext(app.created_at) || new Date().toISOString().split('T')[0],
          score: parseInt(ext(candidate.score) || '0', 10) || 0,
          skills: skills,
          email: ext(candidate.email) || '',
          phone: ext(candidate.phone) || '',
          experience: ext(candidate.experience) || '0 years',
          raw: { candidate, application: app }
        };
      }).filter((c: any) => c.candidate_id && c.name);

      console.log('[HrPanel] Loaded candidates:', this.candidates);
    } catch (e) {
      console.error('[HrPanel] Error loading candidates:', e);
      this.showToast('Failed to load candidates from server.', 'error');
    } finally {
      this.isLoadingCandidates = false;
    }
  }

  async confirmMove() {
    if (this.pendingMove) {
      const candidate = this.pendingMove.candidate;
      const toStage = this.pendingMove.toStage;

      const stageToStatus: { [key: string]: string } = {
        'applied': 'APPLIED',
        'screened': 'SCREENED',
        'interviewing': 'IN_PROGRESS',
        'offered': 'OFFERED',
        'joined': 'JOINED'
      };

      const applicationStatus = stageToStatus[toStage] || toStage.toUpperCase();

      try {
        const oldApp = candidate.raw?.application || candidate;
        await this.heroService.updateCandidateApplication(
          oldApp,
          { application_status: applicationStatus, stage: toStage }
        );

        const idx = this.candidates.findIndex(c => c.application_id === candidate.application_id);
        if (idx !== -1) {
          this.candidates[idx].stage = toStage;
        }

        this.showToast(`Candidate moved to ${this.getStageName(toStage)} successfully!`, 'success');
      } catch (e) {
        console.error('[HrPanel] Error moving candidate:', e);
        this.showToast('Failed to move candidate. Please try again.', 'error');
      }

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
    if (!this.comparatorList.some(c => c.application_id === candidate.application_id)) {
      this.comparatorList.push(candidate);
    }
  }

  removeFromComparator(applicationId: string) {
    this.comparatorList = this.comparatorList.filter(c => c.application_id !== applicationId);
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
  isLoadingReferrals = false;
  referralEmployees: any[] = [];

  get filteredReferralEmployees() {
    if (!this.referralSearchQuery.trim()) return this.referralEmployees;
    const q = this.referralSearchQuery.toLowerCase();
    return this.referralEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }

  get totalReferrals() {
    return this.referralEmployees.reduce((acc, curr) => acc + curr.referralCount, 0);
  }

  get totalSuccessfulHires() {
    return this.referralEmployees.reduce((acc, curr) => acc + curr.successfulReferrals, 0);
  }

  async loadReferrals() {
    this.isLoadingReferrals = true;
    try {
      const [referralsResp, employeesResp, applicationsResp] = await Promise.all([
        this.heroService.getEmployeeReferrals(),
        this.heroService.getEmployees(),
        this.heroService.getCandidateApplications()
      ]);

      const refData = this.heroService.xmltojson(referralsResp, 'tuple');
      const refArray = refData ? (Array.isArray(refData) ? refData : [refData]) : [];

      const empData = this.heroService.xmltojson(employeesResp, 'tuple');
      const empArray = empData ? (Array.isArray(empData) ? empData : [empData]) : [];

      const appData = this.heroService.xmltojson(applicationsResp, 'tuple');
      const appArray = appData ? (Array.isArray(appData) ? appData : [appData]) : [];

      const ext = (field: any) => field?.text || field?.['#text'] || field || '';

      // Create employee map
      const employeeMap = new Map<string, any>();
      empArray.forEach((e: any) => {
        const record = e.old?.employee || e.new?.employee || e.employee || e;
        const empId = ext(record.employee_id);
        if (empId) {
          employeeMap.set(empId, {
            employee_id: empId,
            name: ext(record.employee_name),
            department: ext(record.department),
            role: ext(record.designation)
          });
        }
      });

      // Create application map for checking hired status
      const hiredCandidateIds = new Set<string>();
      appArray.forEach((a: any) => {
        const record = a.old?.candidate_job_application || a.new?.candidate_job_application || a.candidate_job_application || a;
        const stage = ext(record.stage).toLowerCase();
        const candidateId = ext(record.candidate_id);
        if (stage === 'joined' && candidateId) {
          hiredCandidateIds.add(candidateId);
        }
      });

      // Count referrals per employee
      const referralCounts = new Map<string, { total: number; successful: number }>();
      
      refArray.forEach((r: any) => {
        const record = r.old?.employee_referral || r.new?.employee_referral || r.employee_referral || r;
        const empId = ext(record.employee_id);
        const candidateId = ext(record.candidate_id);

        if (!empId) return;

        const current = referralCounts.get(empId) || { total: 0, successful: 0 };
        current.total++;

        if (hiredCandidateIds.has(candidateId)) {
          current.successful++;
        }

        referralCounts.set(empId, current);
      });

      // Build referral employees list
      this.referralEmployees = Array.from(referralCounts.entries()).map(([empId, counts]) => {
        const emp = employeeMap.get(empId) || {};
        const name = emp.name || empId;
        const nameParts = name.split(' ');
        const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

        return {
          id: empId,
          name: name,
          department: emp.department || 'General',
          role: emp.role || 'Not specified',
          avatar: initials,
          referralCount: counts.total,
          successfulReferrals: counts.successful
        };
      });

      console.log('[HrPanel] Loaded referral employees:', this.referralEmployees);
    } catch (e) {
      console.error('[HrPanel] Error loading referrals:', e);
      this.showToast('Failed to load referral data.', 'error');
    } finally {
      this.isLoadingReferrals = false;
    }
  }

  // For backward compatibility with template
  get employees() {
    return this.referralEmployees;
  }

  // --- Offer Tracker ---
  isLoadingOffers = false;
  offeredCandidatesList: any[] = [];
  offerSearchQuery = '';

  showCreateOfferModal = false;
  showPreviewOfferModal = false;
  selectedOfferCandidate: any = null;
  selectedOfferJob: any = null;
  createdOfferId: string = '';

  offerForm = {
    offer_date: '',
    offer_sent_date: '',
    candidate_response_date: '',
    date_of_joining: '',
    salary_offered: '',
    offer_letter_path: '/generated/offer_letter.pdf',
    offer_status: 'DRAFT',
    approval_status: 'PENDING'
  };

  get filteredOffers() {
    if (!this.offerSearchQuery.trim()) return this.offeredCandidatesList;
    const q = this.offerSearchQuery.toLowerCase();
    return this.offeredCandidatesList.filter(o => 
      this.getExt(o.raw?.candidate_name).toLowerCase().includes(q) ||
      this.getExt(o.raw?.candidate_id).toLowerCase().includes(q) ||
      this.getExt(o.raw?.jr_id).toLowerCase().includes(q)
    );
  }

  async loadOfferedApplications() {
    this.isLoadingOffers = true;
    try {
      const resp = await this.heroService.getOfferedApplications();
      let data = this.heroService.xmltojson(resp, 'tuple');
      if (!data) data = this.heroService.xmltojson(resp, 'candidate_job_application');
      if (!data) data = [];
      const arr = Array.isArray(data) ? data : [data];
      
      this.offeredCandidatesList = arr.map((t: any) => {
        const rawApp = t.old?.candidate_job_application || t.new?.candidate_job_application || t.candidate_job_application || t;
        const candidateId = this.getExt(rawApp.candidate_id);
        const jrId = this.getExt(rawApp.jr_id);
        
        // Find matching candidate details if possible
        const matchedCandidate = this.candidates.find((c: any) => c.candidate_id === candidateId) || {};
        const jobTitleFallback = this.getExt(rawApp.job_requisition?.temp2) || matchedCandidate.role || 'Unknown Position';
        
        return {
          raw: {
            ...rawApp,
            candidate_name: this.getExt(rawApp.candidate?.temp1) || matchedCandidate.name || `Candidate ${candidateId}`,
            job_title: jobTitleFallback
          },
          candidate_id: candidateId,
          jr_id: jrId
        };
      }).filter((o: any) => o.raw && Object.keys(o.raw).length > 0);
      
      console.log('[HrPanel] Loaded offered applications:', this.offeredCandidatesList);
    } catch (e) {
      console.error('[HrPanel] Error loading offered applications:', e);
    } finally {
      this.isLoadingOffers = false;
    }
  }

  openCreateOfferModal(offerCand: any) {
    this.selectedOfferCandidate = offerCand;
    const jrId = offerCand.jr_id;
    this.selectedOfferJob = this.jobsList.find(j => j.jr_id === jrId) || { job_title: offerCand.raw.job_title || 'Unknown Position', department: 'Unknown' };
    
    // Reset form
    this.offerForm = {
      offer_date: new Date().toISOString().split('T')[0],
      offer_sent_date: '',
      candidate_response_date: '',
      date_of_joining: '',
      salary_offered: '',
      offer_letter_path: 'draft_offer.pdf',
      offer_status: 'DRAFT',
      approval_status: 'PENDING'
    };
    
    this.showCreateOfferModal = true;
  }

  closeCreateOfferModal() {
    this.showCreateOfferModal = false;
    this.selectedOfferCandidate = null;
    this.selectedOfferJob = null;
  }

  async submitCreateOffer() {
    if (!this.offerForm.salary_offered) {
      this.showToast('Salary is a required field', 'error');
      return;
    }
    
    try {
      const candId = this.selectedOfferCandidate.candidate_id;
      const jrId = this.selectedOfferCandidate.jr_id;
      
      const resp = await this.heroService.createOffer({
        candidate_id: candId,
        jr_id: jrId,
        ...this.offerForm
      });
      
      // Extract the offer_id from the INSERT response so we can UPDATE the same row later
      try {
        const tupleData = this.heroService.xmltojson(resp, 'offer');
        const offerId = this.getExt(tupleData?.offer_id || tupleData?.['offer_id']);
        if (offerId) {
          this.createdOfferId = offerId;
          console.log('[HrPanel] Created offer with offer_id:', this.createdOfferId);
        }
      } catch (parseErr) {
        console.warn('[HrPanel] Could not extract offer_id from response:', parseErr);
      }
      
      this.showToast('Offer details successfully saved!', 'success');
      
      // Close create modal and open preview modal
      this.showCreateOfferModal = false;
      this.showPreviewOfferModal = true;
      
    } catch (e) {
      console.error('Error submitting offer', e);
      this.showToast('Failed to save offer details.', 'error');
    }
  }

  closePreviewOfferModal() {
    this.showPreviewOfferModal = false;
    this.selectedOfferCandidate = null;
    this.selectedOfferJob = null;
  }

  getBase64ImageFromUrl(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No canvas context');
        }
      };
      img.onerror = error => reject(error);
      img.src = imageUrl;
    });
  }

  async generateOfferLetter() {
    try {
      this.showToast('Generating Offer Letter...', 'success');
      const doc = new jsPDF();
      
      let logoBase64 = '';
      try {
        logoBase64 = await this.getBase64ImageFromUrl('assets/images/adnate-logo.png');
      } catch (err) {
        console.warn('Could not load logo image for PDF:', err);
      }

      // --- Thematic Backgrounds ---
      const primaryColor: [number, number, number] = [11, 34, 101]; // #0B2265
      const secondaryColor: [number, number, number] = [0, 196, 240]; // #00C4F0
      
      // Very light background wash
      doc.setFillColor(248, 250, 255);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Top corner geometric branding
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.triangle(0, 0, 90, 0, 0, 60, 'F');
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.triangle(0, 60, 0, 65, 8, 60, 'F');

      // Bottom right geometric branding
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.triangle(210, 297, 120, 297, 210, 237, 'F');
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.triangle(210, 237, 210, 232, 202, 237, 'F');
      
      const candidateName = this.getExt(this.selectedOfferCandidate?.raw?.candidate_name) || 'Candidate';
      const jobTitle = this.selectedOfferJob?.job_title || 'Employee';
      const companyName = 'Adnate IT Solutions';
      const salary = this.offerForm.salary_offered;
      const doj = this.offerForm.date_of_joining ? new Date(this.offerForm.date_of_joining).toLocaleDateString() : 'a date to be decided';
      const offerDate = this.offerForm.offer_date ? new Date(this.offerForm.offer_date).toLocaleDateString() : new Date().toLocaleDateString();

      // Header content
      if (logoBase64) {
        // Adjust width & height as needed for the logo
        doc.addImage(logoBase64, 'PNG', 145, 15, 45, 12);
      } else {
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName, 190, 25, { align: 'right' });
      }

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('2nd Floor,SLC Building,Amrapali Circle,Vaishali Nagar,Jaipur, Rajasthan, India', 190, 35, { align: 'right' });
      doc.text('Email: hr@adnateitsolutions.com | Phone: +91-800-123-4567', 190, 40, { align: 'right' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 48, 190, 48);

      // Date & Recipient
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${offerDate}`, 20, 60);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`To: ${candidateName}`, 20, 72);

      // Subject
      doc.text(`Subject: Offer of Employment - ${jobTitle}`, 20, 84);

      // Body Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      
      const bodyLines = [
        `Dear ${candidateName},`,
        '',
        `We are thrilled to formally offer you the position of ${jobTitle} at ${companyName}.`,
        `Based on our discussions and your interviews, we are confident you will be a great addition`,
        `to our team.`,
        '',
        `Position: ${jobTitle}`,
        `Start Date: ${doj}`,
        `Compensation: Your annual Total Target Cash (TTC) compensation will be Rs. ${salary}/- .`,
        '',
        `This offer is contingent upon the successful completion of a background check, reference`,
        `checks, and verification of your employment eligibility. Please let us know if you require any`,
        `further details prior to your date of joining.`,
        '',
        `We are excited to welcome you aboard to ${companyName} and look forward to building`,
        `great products together.`,
        '',
        `Sincerely,`,
        '',
        `Human Resources`,
        `${companyName}`
      ];

      doc.text(bodyLines, 20, 100);
      
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('This is a highly confidential document and is electronically generated.', 105, 280, { align: 'center' });

      // Save
      const safeName = candidateName.replace(/\s+/g, '_');
      doc.save(`OfferLetter_${safeName}.pdf`);
      
      this.showToast('Offer Letter PDF generated successfully.', 'success');
    } catch (err) {
      console.error('Error creating offer letter PDF:', err);
      this.showToast('Failed to generate PDF.', 'error');
    }
  }

  async sendOfferForApproval() {
    try {
      // Dynamically override statuses for approval send
      this.offerForm.offer_status = 'PENDING';
      this.offerForm.approval_status = 'PENDING';

      if (this.createdOfferId) {
        // UPDATE the existing offer row using offer_id (old/new tuple pattern)
        await this.heroService.updateOfferById(this.createdOfferId, {
          candidate_id: this.selectedOfferCandidate.candidate_id,
          jr_id: this.selectedOfferCandidate.jr_id,
          ...this.offerForm
        });
      } else {
        // Fallback: if we don't have an offer_id, create a new one
        console.warn('[HrPanel] No createdOfferId found, falling back to createOffer');
        const candId = this.selectedOfferCandidate.candidate_id;
        const jrId = this.selectedOfferCandidate.jr_id;
        await this.heroService.createOffer({
          candidate_id: candId,
          jr_id: jrId,
          ...this.offerForm
        });
      }
      
      this.showToast('Offer status changed to PENDING and sent for approval successfully!', 'success');
      this.createdOfferId = ''; // reset after successful update
      this.closePreviewOfferModal();
      this.loadOfferedApplications(); // reload the data
    } catch (e) {
      console.error('Error sending offer for approval:', e);
      this.showToast('Failed to send offer for approval.', 'error');
    }
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
      approval_status: ext(job.raw.approval_status) || 'PENDING',
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
        status: 'INACTIVE',
        modified_at: new Date().toISOString()
      };
      this.isLoadingJobs = true;
      this.heroService.updateJobRequisition(job.id, updatedData)
        .then(() => {
          this.showToast(`Job ${job.title} marked as INACTIVE.`, 'success');
          this.loadJobs();
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

  // ===================== INTERVIEW WORKFLOW =====================

  allInterviews: any[] = [];
  allPanelRecords: any[] = [];

  showFeedbackReviewModal = false;
  reviewingCandidate: any = null;
  candidateInterviewHistory: any[] = [];

  showScheduleFromPipelineModal = false;
  schedulingCandidate: any = null;
  scheduleRoundNumber = 'Round 1';
  scheduleIsHRRound = false;

  async loadInterviewsAndPanels() {
    try {
      const [interviewResp, panelResp] = await Promise.all([
        this.heroService.getInterviews(),
        this.heroService.getInterviewPanels()
      ]);
      let intData = this.heroService.xmltojson(interviewResp, 'tuple');
      if (!intData) intData = this.heroService.xmltojson(interviewResp, 'interview');
      if (!intData) intData = [];
      const intArr = Array.isArray(intData) ? intData : [intData];
      this.allInterviews = intArr.map((t: any) => {
        const r = t.old?.interview || t.new?.interview || t.interview || t;
        return this.flattenRecord(r);
      }).filter((i: any) => i.interview_id);

      let panData = this.heroService.xmltojson(panelResp, 'tuple');
      if (!panData) panData = this.heroService.xmltojson(panelResp, 'interview_panel');
      if (!panData) panData = [];
      const panArr = Array.isArray(panData) ? panData : [panData];
      this.allPanelRecords = panArr.map((t: any) => {
        const r = t.old?.interview_panel || t.new?.interview_panel || t.interview_panel || t;
        return this.flattenRecord(r);
      }).filter((p: any) => p.panel_id);

      console.log('[HrPanel] Loaded interviews:', this.allInterviews.length, 'panels:', this.allPanelRecords.length);
    } catch (e) {
      console.error('[HrPanel] Error loading interviews/panels:', e);
    }
  }

  private flattenRecord(record: any): any {
    if (!record || typeof record !== 'object') return {};
    const result: any = {};
    for (const key of Object.keys(record)) {
      result[key] = this.getExt(record[key]);
    }
    return result;
  }

  getInterviewsForCandidate(candidateId: string, jrId?: string): any[] {
    return this.allInterviews.filter((i: any) =>
      i.candidate_id === candidateId && (!jrId || i.jr_id === jrId)
    ).sort((a: any, b: any) => {
      const roundA = parseInt((a.round || '').replace(/\D/g, '')) || 0;
      const roundB = parseInt((b.round || '').replace(/\D/g, '')) || 0;
      return roundA - roundB;
    });
  }

  getPanelsForInterview(interviewId: string): any[] {
    return this.allPanelRecords.filter((p: any) => p.interview_id === interviewId);
  }

  isAllFeedbackReceived(interviewId: string): boolean {
    const panels = this.getPanelsForInterview(interviewId);
    if (panels.length === 0) return false;
    return panels.every((p: any) => p.feedback && p.rating);
  }

  getLatestInterview(candidateId: string, jrId?: string): any | null {
    const interviews = this.getInterviewsForCandidate(candidateId, jrId);
    return interviews.length > 0 ? interviews[interviews.length - 1] : null;
  }

  getInterviewAvgScore(interviewId: string): number {
    const panels = this.getPanelsForInterview(interviewId);
    const rated = panels.filter((p: any) => p.rating);
    if (rated.length === 0) return 0;
    const total = rated.reduce((sum: number, p: any) => sum + (parseInt(p.rating, 10) || 0), 0);
    return Math.round((total / rated.length) * 100) / 100;
  }

  getCandidateInterviewStatus(candidate: any): string {
    const latest = this.getLatestInterview(candidate.candidate_id);
    if (!latest) return '';
    if (latest.status === 'COMPLETED') {
      return `${latest.round} - Completed (Score: ${latest.final_score || this.getInterviewAvgScore(latest.interview_id)})`;
    }
    if (latest.status === 'SCHEDULED' || latest.status === 'IN_PROGRESS') {
      const panels = this.getPanelsForInterview(latest.interview_id);
      const submitted = panels.filter((p: any) => p.feedback && p.rating).length;
      return `${latest.round} - ${submitted}/${panels.length} feedback received`;
    }
    return latest.status || '';
  }

  async shortlistCandidate(candidate: any) {
    this.schedulingCandidate = candidate;
    this.showScheduleFromPipelineModal = true;
    const existingInterviews = this.getInterviewsForCandidate(candidate.candidate_id);
    const roundNum = existingInterviews.length + 1;
    this.scheduleRoundNumber = `Round ${roundNum}`;
    this.scheduleIsHRRound = false;
    await Promise.all([
      this.loadJobsForInterview(),
      this.loadEmployeesForInterview()
    ]);
    const jrId = this.getExt(candidate.raw?.application?.jr_id);
    if (jrId) {
      this.selectedJobId = jrId;
      await this.onJobSelectForInterview();
      this.selectedCandidateIds = [candidate.candidate_id];
    }
    this.interviewSchedule = {
      round: this.scheduleRoundNumber,
      scheduled_date: '',
      scheduled_time: '',
      meeting_link: ''
    };
  }

  toggleHRRound() {
    this.scheduleIsHRRound = !this.scheduleIsHRRound;
    this.interviewSchedule.round = this.scheduleIsHRRound ? 'HR Round' : this.scheduleRoundNumber;
  }

  closeScheduleFromPipelineModal() {
    this.showScheduleFromPipelineModal = false;
    this.schedulingCandidate = null;
    this.selectedCandidateIds = [];
    this.selectedInterviewerIds = [];
  }

  async rejectCandidate(candidate: any) {
    if (!confirm(`Are you sure you want to reject ${candidate.name}?`)) return;
    try {
      const oldApp = candidate.raw?.application || candidate;
      await this.heroService.updateCandidateApplication(
        oldApp,
        { application_status: 'REJECTED', stage: 'applied' }
      );
      let emailSent = false;
      const email = candidate.email || this.getExt(candidate.raw?.candidate?.email);
      if (email) {
        const jobTitle = this.getJobTitleById(this.getExt(candidate.raw?.application?.jr_id)) || 'the position';
        try { await this.heroService.setEmailProfile(); } catch (e) { console.warn('Failed setting email profile', e); }
        
        try {
          await this.heroService.sendMail(
            email,
            candidate.name,
            '', '',
            `Application Update - ${jobTitle}`,
            `<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Dear ${candidate.name},</h2><p>Thank you for your interest in <strong>${jobTitle}</strong> at Adnate IT Solutions.</p><p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p><p>We appreciate the time you invested and encourage you to apply for future openings.</p><br><p>Best regards,<br>HR Team<br>Adnate IT Solutions</p></div>`
          );
          emailSent = true;
        } catch (mailError) {
          console.warn('[HrPanel] Failed to send rejection email due to invalid/test address:', mailError);
        }
      }
      const idx = this.candidates.findIndex((c: any) => c.application_id === candidate.application_id);
      if (idx !== -1) {
        this.candidates.splice(idx, 1);
      }
      if (emailSent) {
        this.showToast(`${candidate.name} has been rejected and notified via email.`, 'success');
      } else {
        this.showToast(`${candidate.name} has been rejected! (Email could not be sent to test/invalid address)`, 'success');
      }
    } catch (e) {
      console.error('[HrPanel] Error rejecting candidate:', e);
      this.showToast('Failed to reject candidate. Please try again.', 'error');
    }
  }

  async viewCandidateFeedback(candidate: any) {
    this.reviewingCandidate = candidate;
    await this.loadInterviewsAndPanels();
    const jrId = this.getExt(candidate.raw?.application?.jr_id);
    const interviews = this.getInterviewsForCandidate(candidate.candidate_id, jrId);
    this.candidateInterviewHistory = interviews.map((interview: any) => {
      const panels = this.getPanelsForInterview(interview.interview_id);
      const allSubmitted = panels.length > 0 && panels.every((p: any) => p.feedback && p.rating);
      const avgScore = this.getInterviewAvgScore(interview.interview_id);
      return { ...interview, panels, allSubmitted, avgScore };
    });
    this.showFeedbackReviewModal = true;
  }

  closeFeedbackReviewModal() {
    this.showFeedbackReviewModal = false;
    this.reviewingCandidate = null;
    this.candidateInterviewHistory = [];
  }

  async scheduleNextRound(candidate: any) {
    this.closeFeedbackReviewModal();
    await this.shortlistCandidate(candidate);
  }

  async finalAcceptCandidate(candidate: any) {
    if (!confirm(`Accept ${candidate.name} and move to Offered stage?`)) return;
    try {
      const oldApp = candidate.raw?.application || candidate;
      await this.heroService.updateCandidateApplication(
        oldApp,
        { application_status: 'OFFERED', stage: 'offered' }
      );
      const idx = this.candidates.findIndex((c: any) => c.application_id === candidate.application_id);
      if (idx !== -1) {
        this.candidates[idx].stage = 'offered';
      }
      this.closeFeedbackReviewModal();
      this.showToast(`${candidate.name} has been accepted and moved to Offered!`, 'success');
    } catch (e) {
      console.error('[HrPanel] Error accepting candidate:', e);
      this.showToast('Failed to accept candidate. Please try again.', 'error');
    }
  }

  async finalRejectCandidate(candidate: any) {
    this.closeFeedbackReviewModal();
    await this.rejectCandidate(candidate);
  }

  hasPendingFeedback(candidate: any): boolean {
    const jrId = this.getExt(candidate.raw?.application?.jr_id);
    const latest = this.getLatestInterview(candidate.candidate_id, jrId);
    if (!latest) return false;
    return latest.status === 'COMPLETED' || this.isAllFeedbackReceived(latest.interview_id);
  }

  isInInterviewStage(candidate: any): boolean {
    return candidate.stage === 'interviewing';
  }

  async generateReport() {
    this.isGeneratingReport = true;
    
    try {
      // Small delay for UI to show loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const doc = new jsPDF();
      
      // Theme colors
      const primaryColor: [number, number, number] = [11, 34, 101]; // #0B2265
      const secondaryColor: [number, number, number] = [0, 196, 240]; // #00C4F0
      
      // Title
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('HR Recruitment Report', 14, 22);
      
      // Subtitle/Date
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // --- Section 1: Dashboard KPIs ---
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('1. Key Performance Indicators', 14, 45);
      
      const kpiData = [
        ['Open Positions', this.dashboardOpenPositions.toString()],
        ['Active Candidates', this.dashboardActiveCandidates.toString()],
        ['Pending Approvals', this.dashboardPendingApprovals.toString()],
        ['Avg Time-to-Hire', this.dashboardTimeToHire]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: kpiData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 10, cellPadding: 5 }
      });
      
      // --- Section 2: Job Requisitions ---
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.setFontSize(14);
      doc.text('2. Active Job Requisitions', 14, finalY + 15);
      
      const jobData = this.jobsList.map(j => [
        j.jr_id || '-',
        j.job_title || '-',
        j.department || '-',
        j.status || '-',
        j.vacancies || '1'
      ]);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['JR ID', 'Job Title', 'Department', 'Status', 'Vacancies']],
        body: jobData,
        theme: 'striped',
        headStyles: { fillColor: secondaryColor, textColor: 255 },
        styles: { fontSize: 9 }
      });
      
      // --- Section 3: Recruitment Pipeline ---
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('3. Candidate Pipeline Overview', 14, 22);
      
      const pipelineData = [
        ['Applied', this.funnelAppliedCount.toString()],
        ['Screened', this.funnelScreenedCount.toString()],
        ['Interviewing', this.funnelInterviewingCount.toString()],
        ['Offered', this.funnelOfferedCount.toString()],
        ['Joined', this.funnelJoinedCount.toString()]
      ];
      
      autoTable(doc, {
        startY: 28,
        head: [['Pipeline Stage', 'Count']],
        body: pipelineData,
        theme: 'striped',
        headStyles: { fillColor: [47, 75, 143], textColor: 255 },
        styles: { fontSize: 10 }
      });
      
      // Save the PDF
      doc.save(`HR_Report_${new Date().getTime()}.pdf`);
      
      this.showToast('Report generated and downloaded successfully.', 'success');
    } catch (error) {
      console.error('Error generating report:', error);
      this.showToast('Failed to generate report.', 'error');
    } finally {
      this.isGeneratingReport = false;
    }
  }
}
