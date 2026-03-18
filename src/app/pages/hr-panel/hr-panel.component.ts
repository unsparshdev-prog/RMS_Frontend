import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../hero.service';

@Component({
  selector: 'app-hr-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-panel.component.html',
  styleUrls: ['./hr-panel.component.css']
})
export class HrPanelComponent {
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
    status: 'Open',
    approval_status: 'Pending',
    closing_date: ''
  };
  isSubmittingRequisition = false;

  constructor(private heroService: HeroService) {}

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
  panelMembers = [
    { id: 1, name: 'Rajesh Kumar', role: 'Engineering Manager', department: 'Engineering', expertise: 'System Design, DSA', avatar: 'RK', status: 'active', interviewsConducted: 48 },
    { id: 2, name: 'Priya Sharma', role: 'Senior Developer', department: 'Engineering', expertise: 'Frontend, React, Angular', avatar: 'PS', status: 'active', interviewsConducted: 35 },
    { id: 3, name: 'Amit Verma', role: 'Tech Lead', department: 'Engineering', expertise: 'Backend, Microservices', avatar: 'AV', status: 'active', interviewsConducted: 62 },
    { id: 4, name: 'Sneha Patel', role: 'HR Business Partner', department: 'HR & Ops', expertise: 'Culture Fit, Behavioral', avatar: 'SP', status: 'active', interviewsConducted: 90 },
    { id: 5, name: 'Vikram Joshi', role: 'Product Manager', department: 'Product', expertise: 'Product Sense, Strategy', avatar: 'VJ', status: 'inactive', interviewsConducted: 22 },
    { id: 6, name: 'Neha Gupta', role: 'Design Lead', department: 'Design', expertise: 'UI/UX, Portfolio Review', avatar: 'NG', status: 'active', interviewsConducted: 41 }
  ];

  showAddPanelModal = false;
  newPanelist = { name: '', role: '', department: 'Engineering', expertise: '' };
  panelSearchQuery = '';

  get activePanelistCount() {
    return this.panelMembers.filter(m => m.status === 'active').length;
  }

  get inactivePanelistCount() {
    return this.panelMembers.filter(m => m.status === 'inactive').length;
  }

  get filteredPanelMembers() {
    if (!this.panelSearchQuery.trim()) return this.panelMembers;
    const q = this.panelSearchQuery.toLowerCase();
    return this.panelMembers.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q) ||
      m.expertise.toLowerCase().includes(q)
    );
  }

  togglePanelMemberStatus(member: any) {
    member.status = member.status === 'active' ? 'inactive' : 'active';
  }

  openAddPanelModal() {
    this.showAddPanelModal = true;
    this.newPanelist = { name: '', role: '', department: 'Engineering', expertise: '' };
  }

  closeAddPanelModal() {
    this.showAddPanelModal = false;
  }

  addPanelist() {
    if (this.newPanelist.name && this.newPanelist.role) {
      const initials = this.newPanelist.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
      this.panelMembers.push({
        id: this.panelMembers.length + 1,
        name: this.newPanelist.name,
        role: this.newPanelist.role,
        department: this.newPanelist.department,
        expertise: this.newPanelist.expertise,
        avatar: initials,
        status: 'active',
        interviewsConducted: 0
      });
      this.closeAddPanelModal();
    }
  }

  removePanelist(id: number) {
    this.panelMembers = this.panelMembers.filter(m => m.id !== id);
  }

  // --- Scheduling Data (Calendly-like) ---
  schedulingSubTab: 'event-types' | 'single-use' | 'meeting-polls' = 'event-types';
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
    alert(`Link copied for: ${event.title}`);
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

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // --- Job Requisition Submit ---
  submitRequisition() {
    if (!this.requisition.job_title || !this.requisition.department) {
      alert('Please fill in at least the Job Title and Department.');
      return;
    }

    // Combine salary range if needed (use as-is from model)
    this.isSubmittingRequisition = true;

    this.heroService.createJobRequisition(this.requisition)
      .then((response: any) => {
        console.log('Job Requisition created successfully:', response);
        alert('Job Requisition submitted successfully!');
        this.resetRequisitionForm();
      })
      .catch((error: any) => {
        console.error('Error creating job requisition:', error);
        alert('Failed to submit job requisition. Please try again.');
      })
      .finally(() => {
        this.isSubmittingRequisition = false;
      });
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
      status: 'Open',
      approval_status: 'Pending',
      closing_date: ''
    };
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
      alert('You can compare up to 4 candidates at a time.');
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
      alert('Please add at least 2 candidates to compare.');
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
  jobsList = [
    { id: 'J001', title: 'Senior Software Engineer', department: 'Engineering', location: 'Remote', status: 'Open', applicants: 45, datePosted: '2026-03-01' },
    { id: 'J002', title: 'Product Designer', department: 'Design', location: 'Pune, Maharashtra', status: 'Closed', applicants: 120, datePosted: '2026-02-15' },
    { id: 'J003', title: 'HR Business Partner', department: 'HR & Ops', location: 'Jaipur, Rajasthan', status: 'On Hold', applicants: 32, datePosted: '2026-03-10' },
    { id: 'J004', title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', status: 'Open', applicants: 18, datePosted: '2026-03-12' },
    { id: 'J005', title: 'Marketing Manager', department: 'Marketing', location: 'Pune, Maharashtra', status: 'Open', applicants: 67, datePosted: '2026-03-05' }
  ];

  get filteredJobs() {
    if (!this.jobsSearchQuery.trim()) return this.jobsList;
    const q = this.jobsSearchQuery.toLowerCase();
    return this.jobsList.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.department.toLowerCase().includes(q) ||
      j.status.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
  }
}

