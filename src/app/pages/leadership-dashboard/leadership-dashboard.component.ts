import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { LeadershipDashboardService } from './leadership-dashboard.service';
import { jsPDF } from 'jspdf';

interface JobRequisition {
  jr_id: string;
  job_title: string;
  department: string;
  location: string;
  job_description: string;
  required_skills: string;
  min_experience: number;
  max_experience: number;
  salary_range: string;
  no_of_positions: number;
  priority: string;
  status: string;
  approval_status: string;
  closing_date: string;
  created_at: string;
  created_by: string;
}

interface Employee {
  employee_id: string;
  employee_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  role: string;
  joining_date: string;
  status: string;
}

interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  phone: string;
  skills: string;
  experience: number;
  education: string;
  source: string;
  notice_period: number;
  expected_salary: number;
  linkedin_url: string;
  jr_id: string;
  job_title: string;
  interview_status: string;
  interview_round: string;
}

@Component({
  selector: 'app-leadership-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  templateUrl: './leadership-dashboard.component.html',
  styleUrls: ['./leadership-dashboard.component.css']
})
export class LeadershipDashboardComponent implements OnInit {
  activeTab: 'overview' | 'jobs' | 'employees' | 'approvals' | 'candidates' = 'overview';

  Math = Math;
  // Loading & error states
  isLoading = true;
  errorMessage = '';

  // Logged-in user info
  loggedInUserName = 'User';
  loggedInUserInitial = 'U';
  loggedInUserRole = 'Leadership';

  constructor(
    private router: Router,
    private dashboardService: LeadershipDashboardService
  ) {}

  // Chart options — initialized with empty data, updated after API response
  deptChartOptions: EChartsOption = {};
  pipelineChartOptions: EChartsOption = {};
  priorityChartOptions: EChartsOption = {};
  hiringTrendOptions: EChartsOption = {};

  // Search & filter
  jobSearch = '';
  employeeSearch = '';
  candidateSearch = '';
  departmentFilter = 'All Departments';
  selectedJobForCandidates = '';

  // Job detail panel
  selectedJob: JobRequisition | null = null;
  jobApplicants: any[] = [];
  isLoadingApplicants = false;

  // Data arrays — populated from API
  jobs: JobRequisition[] = [];
  pendingApprovals: JobRequisition[] = [];
  employees: Employee[] = [];
  candidates: Candidate[] = [];
  interviews: any[] = [];
  offers: any[] = [];
  candidateApplications: any[] = [];
  offeredCandidates: any[] = [];

  // Pagination for Employees
  employeePage = 1;
  employeePageSize = 10;

  // Accordion toggle states
  jobAccordionOpen = true;
  offerAccordionOpen = true;

  // Offer detail modal
  showOfferDetailModal = false;
  selectedOffer: any = null;
  isProcessingOffer = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToastFlag = false;

  // Approval confirmation modal & loader
  showApproveConfirmModal = false;
  isApprovalLoading = false;
  approvalLoadingMessage = 'Processing...';

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Fetch all data in parallel
      // Try getAllJobRequisitions first (includes pending); fallback to ShowAll
      const [jobsResp, employeesResp, candidatesResp, interviewsResp, offersResp, appResp, offeredResp] = await Promise.all([
        this.dashboardService.getAllJobRequisitions(),
        this.dashboardService.getEmployees(),
        this.dashboardService.getCandidates(),
        this.dashboardService.getInterviews(),
        this.dashboardService.getOffers(),
        this.dashboardService.getCandidateJobApplications(),
        this.dashboardService.getPendingOffers()
      ]);

      // Separate active jobs from pending approvals
      const allJobs: JobRequisition[] = (jobsResp || []).map((j: any) => ({
        jr_id: j.jr_id || '',
        job_title: j.job_title || '',
        department: j.department || '',
        location: j.location || '',
        job_description: j.job_description || '',
        required_skills: j.required_skills || '',
        min_experience: parseInt(j.min_experience, 10) || 0,
        max_experience: parseInt(j.max_experience, 10) || 0,
        salary_range: j.salary_range || '',
        no_of_positions: parseInt(j.no_of_positions, 10) || 0,
        priority: j.priority || '',
        status: j.status || '',
        approval_status: j.approval_status || '',
        closing_date: j.closing_date || '',
        created_at: j.created_at || '',
        created_by: j.created_by || ''
      }));

      console.log('[Dashboard] All jobs parsed:', allJobs.length, allJobs);
      console.log('[Dashboard] Job statuses:', allJobs.map(j => ({ jr_id: j.jr_id, status: j.status, approval_status: j.approval_status })));

      // Active jobs: approval_status is APPROVED or status is OPEN/ACTIVE
      this.jobs = allJobs.filter(j => j.approval_status === 'APPROVED' || j.status === 'OPEN' || j.status === 'ACTIVE');
      this.pendingApprovals = allJobs.filter(j => j.approval_status === 'PENDING')
        .sort((a, b) => {
          const aNum = parseInt(a.jr_id.replace(/\D/g, ''), 10) || 0;
          const bNum = parseInt(b.jr_id.replace(/\D/g, ''), 10) || 0;
          return bNum - aNum;
        });

      console.log('[Dashboard] Active jobs:', this.jobs.length);
      console.log('[Dashboard] Pending approvals:', this.pendingApprovals.length);

      this.employees = (employeesResp || []).map((e: any) => ({
        employee_id: e.employee_id || '',
        employee_name: e.employee_name || '',
        email: e.email || '',
        phone: e.phone || '',
        department: e.department || '',
        designation: e.designation || '',
        role: e.role || '',
        joining_date: e.joining_date || '',
        status: e.status || ''
      }));

      this.candidates = (candidatesResp || []).map((c: any) => ({
        candidate_id: c.candidate_id || '',
        name: c.name || c.candidate_name || '',
        email: c.email || '',
        phone: c.phone || '',
        skills: c.skills || '',
        experience: parseInt(c.experience, 10) || 0,
        education: c.education || '',
        source: c.source || '',
        notice_period: parseInt(c.notice_period, 10) || 0,
        expected_salary: parseInt(c.expected_salary, 10) || 0,
        linkedin_url: c.linkedin_url || '',
        jr_id: c.jr_id || '',
        job_title: c.job_title || '',
        interview_status: c.interview_status || '',
        interview_round: c.interview_round || ''
      }));

      this.interviews = interviewsResp || [];
      this.offers = offersResp || [];
      this.candidateApplications = appResp || [];
      this.offeredCandidates = (offeredResp || []).map((o: any) => {
        const candidateId = o.candidate_id || '';
        const jrId = o.jr_id || '';
        
        // Enrich with candidate master data
        const cand = this.candidates.find(c => c.candidate_id === candidateId) || {} as any;
        const candidateName = cand.name || candidateId || 'Unknown';
        
        // Enrich with job info
        const jobInfo = allJobs.find(j => j.jr_id === jrId) || {} as any;
        const jobTitle = jobInfo.job_title || jrId || 'Unknown Position';

        return {
          candidate_id: candidateId,
          jr_id: jrId,
          candidate_name: candidateName,
          job_title: jobTitle,
          application_status: 'OFFERED',
          stage: 'offered',
          // Candidate details
          email: cand.email || '',
          phone: cand.phone || '',
          skills: cand.skills || '',
          experience: cand.experience || 0,
          education: cand.education || '',
          // Offer details
          offer_id: o.offer_id || '',
          offer_date: o.offer_date || '',
          date_of_joining: o.date_of_joining || '',
          salary_offered: o.salary_offered || '',
          offer_status: o.offer_status || '',
          approval_status: o.approval_status || 'PENDING',
          raw: o
        };
      });

      // Resolve logged-in user name from employee data
      const loggedInId = sessionStorage.getItem('employeeId') || '';
      console.log('[Dashboard] Looking up user. employeeId =', loggedInId);
      console.log('[Dashboard] Employee IDs in DB:', this.employees.map(e => e.employee_id));
      console.log('[Dashboard] Employee emails in DB:', this.employees.map(e => e.email));

      if (loggedInId && this.employees.length > 0) {
        // Try matching by employee_id first, then by email
        const me = this.employees.find(e =>
          e.employee_id.toLowerCase() === loggedInId.toLowerCase() ||
          e.email.toLowerCase() === loggedInId.toLowerCase()
        );
        if (me) {
          console.log('[Dashboard] Matched user:', me.employee_name);
          this.loggedInUserName = me.employee_name;
          this.loggedInUserInitial = me.employee_name.charAt(0).toUpperCase();
          this.loggedInUserRole = me.designation || me.role || 'Leadership';
        } else {
          console.warn('[Dashboard] No employee match found for:', loggedInId);
        }
      }

      // Build charts from live data
      this.buildCharts();

    } catch (error: any) {
      console.error('LeadershipDashboard: failed to load data', error);
      this.errorMessage = 'Failed to load dashboard data. Please check your connection and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // ─── Build Charts from API Data ───
  private buildCharts(): void {
    this.buildDeptChart();
    this.buildPipelineChart();
    this.buildPriorityChart();
    this.buildHiringTrendChart();
  }

  private buildDeptChart(): void {
    const deptMap: Record<string, number> = {};
    this.jobs.forEach(j => {
      const dept = j.department || 'Unknown';
      deptMap[dept] = (deptMap[dept] || 0) + (j.no_of_positions || 1);
    });
    const depts = Object.keys(deptMap);
    const counts = depts.map(d => deptMap[d]);

    this.deptChartOptions = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: depts.length > 0 ? depts : ['No Data'],
        axisLabel: { color: '#4a5d75', fontSize: 11, interval: 0 },
        axisLine: { lineStyle: { color: '#e1e8ed' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4a5d75', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f0f4f8' } }
      },
      series: [{
        type: 'bar',
        data: counts.length > 0 ? counts : [0],
        barWidth: '45%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: '#00C4F0' }, { offset: 1, color: '#0B2265' }
          ]}
        }
      }]
    };
  }

  private buildPipelineChart(): void {
    const stageMap: Record<string, number> = {};
    this.candidateApplications.forEach((a: any) => {
      const rawStage = (a.application_status || a.stage || 'APPLIED').toUpperCase();
      stageMap[rawStage] = (stageMap[rawStage] || 0) + 1;
    });

    const colorMap: Record<string, string> = {
      'APPLIED': '#0B2265',
      'SCREENED': '#2F4B8F',
      'SHORTLISTED': '#4B6EAF',
      'IN_PROGRESS': '#0088A8',
      'OFFERED': '#00C4F0',
      'JOINED': '#10B981',
      'REJECTED': '#e74c3c'
    };
    const data = Object.entries(stageMap).map(([name, value]) => ({
      value, name, itemStyle: { color: colorMap[name] || '#9b59b6' }
    }));

    this.pipelineChartOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: '0', textStyle: { color: '#4a5d75', fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: data.length > 0 ? data : [{ value: 0, name: 'No Data' }]
      }]
    };
  }

  private buildPriorityChart(): void {
    const priorityMap: Record<string, number> = {};
    this.jobs.forEach(j => {
      const p = j.priority || 'Unknown';
      priorityMap[p] = (priorityMap[p] || 0) + 1;
    });

    const colorMap: Record<string, string> = {
      'HIGH': '#e74c3c',
      'MEDIUM': '#FF6B35',
      'LOW': '#00C4F0'
    };
    const data = Object.entries(priorityMap).map(([name, value]) => ({
      value, name, itemStyle: { color: colorMap[name] || '#9b59b6' }
    }));

    this.priorityChartOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} jobs' },
      legend: { bottom: '0', textStyle: { color: '#4a5d75', fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: '65%',
        center: ['50%', '42%'],
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { color: '#4a5d75', fontSize: 11 },
        data: data.length > 0 ? data : [{ value: 0, name: 'No Data' }]
      }]
    };
  }

  private buildHiringTrendChart(): void {
    // Group offers by month for hiring trend
    const monthMap: Record<string, number> = {};
    const jobMonthMap: Record<string, number> = {};

    this.offers.forEach((o: any) => {
      const date = o.offer_date || o.created_at || '';
      if (date) {
        const month = date.substring(0, 7); // YYYY-MM
        monthMap[month] = (monthMap[month] || 0) + 1;
      }
    });

    this.jobs.forEach(j => {
      const date = j.created_at || '';
      if (date) {
        const month = date.substring(0, 7);
        jobMonthMap[month] = (jobMonthMap[month] || 0) + 1;
      }
    });

    // Merge all months and sort
    const allMonths = [...new Set([...Object.keys(monthMap), ...Object.keys(jobMonthMap)])].sort();
    const monthLabels = allMonths.map(m => {
      const parts = m.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return monthNames[parseInt(parts[1], 10) - 1] || m;
    });

    this.hiringTrendOptions = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
      xAxis: {
        type: 'category',
        data: monthLabels.length > 0 ? monthLabels : ['No Data'],
        axisLabel: { color: '#4a5d75', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e1e8ed' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#4a5d75', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f0f4f8' } }
      },
      series: [
        {
          name: 'Jobs Opened',
          type: 'line',
          smooth: true,
          data: allMonths.map(m => jobMonthMap[m] || 0),
          lineStyle: { color: '#0B2265', width: 3 },
          itemStyle: { color: '#0B2265' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(11,34,101,0.15)' }, { offset: 1, color: 'rgba(11,34,101,0)' }
          ]}}
        },
        {
          name: 'Candidates Hired',
          type: 'line',
          smooth: true,
          data: allMonths.map(m => monthMap[m] || 0),
          lineStyle: { color: '#00C4F0', width: 3 },
          itemStyle: { color: '#00C4F0' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(0,196,240,0.15)' }, { offset: 1, color: 'rgba(0,196,240,0)' }
          ]}}
        }
      ]
    };
  }

  // ─── Computed properties ───
  get departments(): string[] {
    const depts = new Set(this.employees.map(e => e.department));
    return ['All Departments', ...Array.from(depts).sort()];
  }

  get uniqueJobsForFilter(): JobRequisition[] {
    return this.jobs;
  }

  get filteredJobs(): JobRequisition[] {
    const q = this.jobSearch.toLowerCase();
    return this.jobs.filter(j =>
      j.job_title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.jr_id.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aNum = parseInt(a.jr_id.replace(/\D/g, ''), 10) || 0;
      const bNum = parseInt(b.jr_id.replace(/\D/g, ''), 10) || 0;
      return bNum - aNum;
    });
  }

  get filteredEmployees(): Employee[] {
    let result = this.employees;
    if (this.departmentFilter && this.departmentFilter !== 'All Departments') {
      result = result.filter(e => e.department === this.departmentFilter);
    }
    const q = this.employeeSearch.toLowerCase();
    if (q) {
      result = result.filter(e =>
        e.employee_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q)
      );
    }
    return result;
  }

  get paginatedEmployees(): Employee[] {
    const start = (this.employeePage - 1) * this.employeePageSize;
    return this.filteredEmployees.slice(start, start + this.employeePageSize);
  }

  get employeeTotalPages(): number {
    return Math.ceil(this.filteredEmployees.length / this.employeePageSize);
  }

  changeEmployeePage(delta: number) {
    const next = this.employeePage + delta;
    if (next >= 1 && next <= this.employeeTotalPages) {
      this.employeePage = next;
    }
  }

  get filteredCandidates(): Candidate[] {
    let result = this.candidates;
    if (this.selectedJobForCandidates) {
      result = result.filter(c => c.jr_id === this.selectedJobForCandidates);
    }
    const q = this.candidateSearch.toLowerCase();
    if (q) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.skills.toLowerCase().includes(q) ||
        c.candidate_id.toLowerCase().includes(q)
      );
    }
    return result;
  }

  get activeEmployeeCount(): number {
    return this.employees.filter(e => e.status === 'ACTIVE').length;
  }

  get highPriorityJobCount(): number {
    return this.jobs.filter(j => j.priority === 'HIGH').length;
  }

  get interviewsInProgressCount(): number {
    return this.candidates.filter(c => c.interview_status === 'IN_PROGRESS').length;
  }

  get totalPositions(): number {
    return this.jobs.reduce((sum, j) => sum + j.no_of_positions, 0);
  }

  // ─── Actions ───
  setTab(tab: 'overview' | 'jobs' | 'employees' | 'approvals' | 'candidates') {
    this.activeTab = tab;
  }

  async approveRequisition(jr: JobRequisition): Promise<void> {
    try {
      const oldData = { ...jr };
      const newData = { ...jr, status: 'ACTIVE', approval_status: 'APPROVED' };
      await this.dashboardService.updateJobRequisition(oldData, newData);

      // Update local state immediately
      jr.status = 'ACTIVE';
      jr.approval_status = 'APPROVED';
      this.jobs.push({ ...jr });
      this.pendingApprovals = this.pendingApprovals.filter(a => a.jr_id !== jr.jr_id);
      this.buildCharts();
    } catch (error) {
      console.error('Failed to approve requisition:', error);
      alert('Failed to approve requisition. Please try again.');
    }
  }

  async rejectRequisition(jr: JobRequisition): Promise<void> {
    try {
      const oldData = { ...jr };
      const newData = { ...jr, status: 'INACTIVE', approval_status: 'REJECTED' };
      await this.dashboardService.updateJobRequisition(oldData, newData);

      // Update local state immediately
      jr.status = 'INACTIVE';
      jr.approval_status = 'REJECTED';
      this.pendingApprovals = this.pendingApprovals.filter(a => a.jr_id !== jr.jr_id);
    } catch (error) {
      console.error('Failed to reject requisition:', error);
      alert('Failed to reject requisition. Please try again.');
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': case 'APPROVED': case 'COMPLETED': case 'OPEN': return 'status-active';
      case 'IN_PROGRESS': case 'SCHEDULED': return 'status-in-progress';
      case 'PENDING': case 'DRAFT': return 'status-pending';
      case 'ON_LEAVE': case 'CLOSED': case 'REJECTED': return 'status-on-leave';
      default: return '';
    }
  }

  getCandidateCountForJob(jrId: string): number {
    return this.candidates.filter(c => c.jr_id === jrId).length;
  }

  async openJobDetail(job: JobRequisition): Promise<void> {
    this.selectedJob = job;
    this.jobApplicants = [];
    this.isLoadingApplicants = true;
    try {
      const applications = await this.dashboardService.getCandidateApplicationsForJob(job.jr_id);
      console.log('[Dashboard] Applications for', job.jr_id, ':', applications);

      // Cross-reference with candidate data to enrich application info
      this.jobApplicants = applications.map((app: any) => {
        const candidate = this.candidates.find(c => c.candidate_id === app.candidate_id);
        return {
          application_id: app.application_id || '',
          candidate_id: app.candidate_id || '',
          jr_id: app.jr_id || '',
          application_status: app.application_status || 'APPLIED',
          applied_at: app.applied_at || '',
          // Enriched candidate info
          name: candidate?.name || app.candidate_id || 'Unknown',
          email: candidate?.email || '',
          phone: candidate?.phone || '',
          skills: candidate?.skills || '',
          experience: candidate?.experience || 0,
          education: candidate?.education || ''
        };
      });
    } catch (e) {
      console.error('Failed to load applicants:', e);
    } finally {
      this.isLoadingApplicants = false;
    }
  }

  closeJobDetail(): void {
    this.selectedJob = null;
    this.jobApplicants = [];
  }

  getApplicationStatusClass(status: string): string {
    switch (status) {
      case 'SELECTED': case 'SHORTLISTED': return 'status-active';
      case 'APPLIED': return 'status-in-progress';
      case 'REJECTED': return 'status-on-leave';
      default: return 'status-pending';
    }
  }

  toggleJobAccordion() {
    this.jobAccordionOpen = !this.jobAccordionOpen;
  }

  toggleOfferAccordion() {
    this.offerAccordionOpen = !this.offerAccordionOpen;
  }

  // ─── Offer Detail Modal ───
  openOfferDetailModal(offer: any) {
    this.selectedOffer = offer;
    this.showOfferDetailModal = true;
  }

  closeOfferDetailModal() {
    this.showOfferDetailModal = false;
    this.selectedOffer = null;
  }

  // ─── Approve Confirmation Modal ───
  openApproveConfirmModal() {
    if (!this.selectedOffer) return;
    this.showApproveConfirmModal = true;
  }

  closeApproveConfirmModal() {
    this.showApproveConfirmModal = false;
  }

  async confirmApproveOffer() {
    // Close the confirmation modal and show the loader
    this.showApproveConfirmModal = false;
    this.showOfferDetailModal = false;
    this.isApprovalLoading = true;
    this.approvalLoadingMessage = 'Updating offer status...';

    try {
      // 1. Update offer status to APPROVED via UpdateOffer WS (old/new tuple pattern)
      const offerId = this.selectedOffer.offer_id;
      if (!offerId) {
        this.isApprovalLoading = false;
        this.showToast2('Offer ID not found. Cannot update status.', 'error');
        return;
      }
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      await this.dashboardService.approveOfferStatus(offerId, 'APPROVED', todayDate);

      let emailSent = false;
      // 2. Generate PDF and send offer letter email with attachment
      if (this.selectedOffer.email) {
        try {
          this.approvalLoadingMessage = 'Generating offer letter PDF...';
          const pdfBase64 = this.generateOfferLetterPDFBase64(this.selectedOffer);
          const htmlBody = this.buildOfferLetterHTML(this.selectedOffer);
          const jobTitle = (this.selectedOffer.job_title || 'Position').replace(/[^a-zA-Z0-9]/g, '_');
          const attachmentName = `OfferLetter_${jobTitle}_AdnateITSolution.pdf`;

          this.approvalLoadingMessage = 'Sending offer letter with PDF attachment...';
          await this.dashboardService.sendOfferEmailWithAttachment(
            this.selectedOffer.email,
            this.selectedOffer.candidate_name,
            `Offer Letter - ${this.selectedOffer.job_title} | Adnate IT Solutions`,
            htmlBody,
            pdfBase64,
            attachmentName
          );
          emailSent = true;
        } catch (mailError) {
          console.warn('[Leadership] Failed to send offer letter email:', mailError);
        }
      }

      // 3. Update local state
      this.selectedOffer.approval_status = 'APPROVED';
      this.selectedOffer.offer_status = 'APPROVED';
      this.offeredCandidates = this.offeredCandidates.filter(c => c.offer_id !== offerId);

      // 4. Hide loader and show success toast
      this.isApprovalLoading = false;
      if (emailSent) {
        this.showToast2('Offer approved and email with PDF attachment sent successfully!', 'success');
      } else {
        this.showToast2('Offer approved! (Email could not be sent — check recipient address)', 'success');
      }
      this.selectedOffer = null;
      // We removed it locally so no need to reload unless explicitly wanted, but it ensures exact match if done.
      // this.loadAllData();
    } catch (e) {
      console.error('[Leadership] Error approving offer:', e);
      this.isApprovalLoading = false;
      this.showToast2('Failed to approve offer. Please try again.', 'error');
    }
  }

  async rejectOffer() {
    if (!this.selectedOffer || this.isProcessingOffer) return;
    if (!confirm(`Are you sure you want to reject the offer for ${this.selectedOffer.candidate_name}?`)) return;
    this.isProcessingOffer = true;

    try {
      const offerId = this.selectedOffer.offer_id;
      if (!offerId) {
        this.showToast2('Offer ID not found. Cannot reject.', 'error');
        this.isProcessingOffer = false;
        return;
      }
      await this.dashboardService.updateOffer(offerId, {
        candidate_id: this.selectedOffer.candidate_id,
        jr_id: this.selectedOffer.jr_id,
        offer_date: this.selectedOffer.offer_date || '',
        date_of_joining: this.selectedOffer.date_of_joining || '',
        salary_offered: this.selectedOffer.salary_offered || '',
        offer_letter_path: '',
        offer_status: 'REJECTED',
        approval_status: 'REJECTED',
        offer_sent_date: '',
        candidate_response_date: ''
      });

      let emailSent = false;
      // Send rejection notification if email exists
      if (this.selectedOffer.email) {
        try {
          await this.dashboardService.sendOfferEmail(
            this.selectedOffer.email,
            this.selectedOffer.candidate_name,
            `Application Update - ${this.selectedOffer.job_title} | Adnate IT Solutions`,
            `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;">
              <div style="background:#0B2265;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:20px;">Adnate IT Solutions</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #e1e8ed;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#0B2265;margin-top:0;">Dear ${this.selectedOffer.candidate_name},</h2>
                <p style="color:#4a5d75;line-height:1.7;">Thank you for your interest in the position of <strong>${this.selectedOffer.job_title}</strong> at Adnate IT Solutions.</p>
                <p style="color:#4a5d75;line-height:1.7;">After careful review, we regret to inform you that we will not be moving forward with the offer at this time.</p>
                <p style="color:#4a5d75;line-height:1.7;">We appreciate the time you invested and encourage you to apply for future openings.</p>
                <br>
                <p style="color:#4a5d75;">Best regards,<br><strong>HR Team</strong><br>Adnate IT Solutions</p>
              </div>
            </div>`
          );
          emailSent = true;
        } catch (mailError) {
          console.warn('[Leadership] Failed to send rejection email due to invalid/test address:', mailError);
        }
      }

      this.selectedOffer.approval_status = 'REJECTED';
      this.selectedOffer.offer_status = 'REJECTED';
      this.offeredCandidates = this.offeredCandidates.filter((c: any) => c.offer_id !== offerId);

      if (emailSent) {
        this.showToast2('Offer rejected successfully and the candidate was notified.', 'success');
      } else {
        this.showToast2('Offer rejected! (Rejection email could not be sent to test/invalid address)', 'success');
      }
      
      this.closeOfferDetailModal();
      // this.loadAllData(); // Instead of reloading, we already filtered it out
    } catch (e) {
      console.error('[Leadership] Error rejecting offer:', e);
      this.showToast2('Failed to reject offer. Please try again.', 'error');
    } finally {
      this.isProcessingOffer = false;
    }
  }

  /**
   * Generates a branded offer letter PDF using jsPDF and returns the
   * raw Base64-encoded string (without the data:application/pdf prefix)
   * so it can be attached to an email.
   */
  private generateOfferLetterPDFBase64(offer: any): string {
    const doc = new jsPDF();
    const candidateName = offer.candidate_name || 'Candidate';
    const jobTitle = offer.job_title || 'Employee';
    const companyName = 'Adnate IT Solutions';
    const salary = offer.salary_offered || 'as discussed';
    const doj = offer.date_of_joining
      ? new Date(offer.date_of_joining).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'a date to be decided';
    const offerDate = offer.offer_date
      ? new Date(offer.offer_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    // --- Theme Colors ---
    const primaryColor: [number, number, number] = [11, 34, 101]; // #0B2265
    const secondaryColor: [number, number, number] = [0, 196, 240]; // #00C4F0

    // Light background wash
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

    // Header
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(companyName, 190, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('2nd Floor, SLC Building, Amrapali Circle, Vaishali Nagar, Jaipur, Rajasthan, India', 190, 35, { align: 'right' });
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

    // Body
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
      `Compensation: Your annual Total Target Cash (TTC) compensation will be Rs. ${salary}/-.`,
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

    // Return Base64 string (strip the data:…;base64, prefix)
    const dataUri = doc.output('datauristring');
    const base64 = dataUri.split(',')[1];
    return base64;
  }

  private buildOfferLetterHTML(offer: any): string {
    const candidateName = offer.candidate_name || 'Candidate';
    const jobTitle = offer.job_title || 'Employee';
    const salary = offer.salary_offered || 'as discussed';
    const doj = offer.date_of_joining
      ? new Date(offer.date_of_joining).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'a date to be decided';
    const offerDate = offer.offer_date
      ? new Date(offer.offer_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    return `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:680px;margin:0 auto;background:#f8faff;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#0B2265 0%,#132d7a 100%);padding:32px 40px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(0,196,240,0.15);"></div>
        <div style="position:absolute;bottom:-20px;left:40%;width:80px;height:80px;border-radius:50%;background:rgba(0,196,240,0.08);"></div>
        <table width="100%" cellpadding="0" cellspacing="0" style="position:relative;z-index:1;">
          <tr>
            <td>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Adnate IT Solutions</h1>
              <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:12px;">2nd Floor, SLC Building, Amrapali Circle, Vaishali Nagar, Jaipur, Rajasthan</p>
            </td>
            <td style="text-align:right;">
              <span style="background:rgba(0,196,240,0.2);color:#00C4F0;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;">OFFER LETTER</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body -->
      <div style="background:#fff;padding:40px;border-left:1px solid #e1e8ed;border-right:1px solid #e1e8ed;">
        <p style="color:#8899a8;font-size:13px;margin:0 0 24px;">Date: ${offerDate}</p>

        <h2 style="color:#0B2265;font-size:18px;margin:0 0 8px;">Dear ${candidateName},</h2>

        <p style="color:#4a5d75;line-height:1.8;font-size:14px;">
          We are thrilled to formally offer you the position of <strong style="color:#0B2265;">${jobTitle}</strong> at <strong>Adnate IT Solutions</strong>.
          Based on our discussions and your interviews, we are confident you will be a great addition to our team.
        </p>

        <!-- Offer Details Card -->
        <div style="background:linear-gradient(135deg,#f0f4ff 0%,#e8f7fc 100%);border-radius:12px;padding:24px;margin:24px 0;border:1px solid rgba(0,196,240,0.15);">
          <h3 style="color:#0B2265;margin:0 0 16px;font-size:15px;">Offer Details</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;">
                <span style="color:#8899a8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Position</span><br>
                <span style="color:#0f1f3d;font-size:14px;font-weight:600;">${jobTitle}</span>
              </td>
              <td style="padding:8px 0;">
                <span style="color:#8899a8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Start Date</span><br>
                <span style="color:#0f1f3d;font-size:14px;font-weight:600;">${doj}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;" colspan="2">
                <span style="color:#8899a8;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Annual Compensation (TTC)</span><br>
                <span style="color:#10B981;font-size:18px;font-weight:800;">Rs. ${salary}/-</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="color:#4a5d75;line-height:1.8;font-size:14px;">
          This offer is contingent upon the successful completion of a background check, reference checks, and verification of your employment eligibility.
          Please let us know if you require any further details prior to your date of joining.
        </p>

        <p style="color:#4a5d75;line-height:1.8;font-size:14px;">
          We are excited to welcome you aboard to Adnate IT Solutions and look forward to building great products together.
        </p>

        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e1e8ed;">
          <p style="color:#0f1f3d;font-weight:600;margin:0;">Sincerely,</p>
          <p style="color:#4a5d75;margin:8px 0 0;">Human Resources<br><strong style="color:#0B2265;">Adnate IT Solutions</strong></p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#0B2265;padding:20px 40px;border-radius:0 0 12px 12px;text-align:center;">
        <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
          This is a confidential document and is electronically generated. | hr@adnateitsolutions.com
        </p>
      </div>
    </div>`;
  }

  showToast2(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastFlag = true;
    setTimeout(() => this.showToastFlag = false, 4000);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
