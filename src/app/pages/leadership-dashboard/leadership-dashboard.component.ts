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

interface InterviewRequest {
  panel_id: string;
  interview_id: string;
  interviewer_id: string;
  interviewer_name: string;
  feedback: string;
  rating: number;
  candidate_name: string;
  candidate_email: string;
  candidate_id: string;
  candidate_skills: string;
  candidate_experience: number;
  jr_id: string;
  job_title: string;
  job_department: string;
  job_location: string;
  job_description: string;
  required_skills: string;
  round: string;
  scheduled_date: string;
  scheduled_time: string;
  meeting_link: string;
  interview_status: string;
  accepted: boolean;
  delegated_by: string;
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
  activeTab: 'overview' | 'jobs' | 'approvals' | 'candidates' | 'interviews' = 'overview';

  Math = Math;
  // Loading & error states
  isLoading = true;
  errorMessage = '';

  // Logged-in user info
  loggedInUserName = 'User';
  loggedInUserInitial = 'U';
  loggedInUserRole = 'Leadership';
  loggedInEmployeeId = '';

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

  // Interview data
  myInterviewRequests: InterviewRequest[] = [];
  myAcceptedInterviews: InterviewRequest[] = [];

  // Interview detail panel
  selectedInterview: InterviewRequest | null = null;
  feedbackText = '';
  feedbackRating = 0;
  isSubmittingFeedback = false;
  technicalSkills = '';
  communicationSkills = '';
  culturalFit = '';
  anotherInterviewRequired = '';

  // Delegation modal
  showDelegateModal = false;
  delegatingRequest: InterviewRequest | null = null;
  delegateEmployeeId = '';
  delegateReason = '';
  isDelegating = false;

  // Pagination for Employees
  employeePage = 1;
  employeePageSize = 10;

  // Pagination for Jobs (Active Jobs tab)
  jobPage = 1;
  readonly jobPageSize = 4;

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

  // Job Requisition confirmation modal
  showJrConfirmModal = false;
  jrConfirmAction: 'approve' | 'reject' = 'approve';
  selectedRequisition: JobRequisition | null = null;
  jrRejectRemarks = '';

  // Offer letter confirmation modal
  showOfferConfirmModal = false;
  offerConfirmAction: 'approve' | 'suggest_changes' = 'approve';
  selectedOfferForConfirm: any = null;
  offerSuggestChangesText = '';

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

      // Active jobs: approval_status is APPROVED or status is OPEN/ACTIVE (case-insensitive)
      this.jobs = allJobs.filter(j => {
        const approval = (j.approval_status || '').toUpperCase();
        const status = (j.status || '').toUpperCase();
        return approval === 'APPROVED' || status === 'OPEN' || status === 'ACTIVE';
      });
      this.pendingApprovals = allJobs.filter(j => (j.approval_status || '').toUpperCase() === 'PENDING')
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
      let resolvedEmployeeId = loggedInId;

      if (loggedInId && this.employees.length > 0) {
        // Try matching by employee_id first, then by email
        const me = this.employees.find(e =>
          e.employee_id.toLowerCase() === loggedInId.toLowerCase() ||
          e.email.toLowerCase() === loggedInId.toLowerCase()
        );
        if (me) {
          this.loggedInUserName = me.employee_name;
          this.loggedInUserInitial = me.employee_name.charAt(0).toUpperCase();
          this.loggedInUserRole = me.designation || me.role || 'Leadership';
          resolvedEmployeeId = me.employee_id;
          this.loggedInEmployeeId = me.employee_id;
        }
      }

      // Load interview panels for the logged-in user
      if (resolvedEmployeeId) {
        try {
          const panels = await this.dashboardService.getInterviewPanelForInterviewer(resolvedEmployeeId);
          const allInterviews = this.interviews;

          const enrichedPanels: InterviewRequest[] = panels.map((p: any) => {
            const interview = allInterviews.find((i: any) => i.interview_id === p.interview_id) || {} as any;
            const candidate = this.candidates.find((c: any) => c.candidate_id === interview.candidate_id) || {} as any;
            const job = this.jobs.find((j: any) => j.jr_id === interview.jr_id) ||
                        allJobs.find((j: any) => j.jr_id === interview.jr_id) || {} as any;

            const temp1 = (p.temp1 || '').toUpperCase();
            const accepted = temp1 === 'ACCEPTED';
            const delegated = temp1 === 'DELEGATED';

            return {
              panel_id: p.panel_id || '',
              interview_id: p.interview_id || '',
              interviewer_id: p.interviewer_id || '',
              interviewer_name: p.interviewer_name || '',
              feedback: p.feedback || '',
              rating: parseInt(p.rating, 10) || 0,
              candidate_name: candidate.name || '',
              candidate_email: candidate.email || '',
              candidate_id: candidate.candidate_id || interview.candidate_id || '',
              candidate_skills: candidate.skills || '',
              candidate_experience: parseInt(candidate.experience, 10) || 0,
              jr_id: interview.jr_id || '',
              job_title: job.job_title || '',
              job_department: job.department || '',
              job_location: job.location || '',
              job_description: job.job_description || '',
              required_skills: job.required_skills || '',
              round: interview.round || '',
              scheduled_date: interview.scheduled_date || '',
              scheduled_time: interview.scheduled_time || '',
              meeting_link: interview.meeting_link || '',
              interview_status: interview.status || '',
              accepted,
              delegated_by: '',
              _delegated: delegated
            } as any;
          });

          this.myInterviewRequests = enrichedPanels.filter(r => !r.accepted && !(r as any)._delegated);
          this.myAcceptedInterviews = enrichedPanels.filter(r => r.accepted && !r.feedback);
          console.log('[Dashboard] Interview requests:', this.myInterviewRequests.length);
          console.log('[Dashboard] Accepted interviews:', this.myAcceptedInterviews.length);
        } catch (e) {
          console.warn('[Dashboard] Failed to load interview panels:', e);
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
      const rawDept = (j.department || 'Unknown').trim();
      // Normalize to title case for case-insensitive grouping
      const dept = rawDept.charAt(0).toUpperCase() + rawDept.slice(1).toLowerCase();
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
      const p = (j.priority || 'Unknown').toUpperCase();
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
    const filtered = this.jobs.filter(j =>
      j.job_title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.jr_id.toLowerCase().includes(q)
    ).sort((a, b) => {
      const aNum = parseInt(a.jr_id.replace(/\D/g, ''), 10) || 0;
      const bNum = parseInt(b.jr_id.replace(/\D/g, ''), 10) || 0;
      return bNum - aNum;
    });

    // Clamp jobPage if search reduces total pages
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.jobPageSize));
    if (this.jobPage > totalPages) {
      this.jobPage = totalPages;
    }

    return filtered;
  }

  get paginatedJobs(): JobRequisition[] {
    const start = (this.jobPage - 1) * this.jobPageSize;
    return this.filteredJobs.slice(start, start + this.jobPageSize);
  }

  get jobTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredJobs.length / this.jobPageSize));
  }

  changeJobPage(delta: number): void {
    const next = this.jobPage + delta;
    if (next >= 1 && next <= this.jobTotalPages) {
      this.jobPage = next;
    }
  }

  get filteredEmployees(): Employee[] {
    let result = this.employees;
    if (this.departmentFilter && this.departmentFilter !== 'All Departments') {
      result = result.filter(e => e.department.toLowerCase() === this.departmentFilter.toLowerCase());
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
    return this.employees.filter(e => (e.status || '').toUpperCase() === 'ACTIVE').length;
  }

  get highPriorityJobCount(): number {
    return this.jobs.filter(j => (j.priority || '').toUpperCase() === 'HIGH').length;
  }

  get interviewsInProgressCount(): number {
    return this.candidates.filter(c => (c.interview_status || '').toUpperCase() === 'IN_PROGRESS').length;
  }

  get totalPositions(): number {
    return this.jobs.reduce((sum, j) => sum + j.no_of_positions, 0);
  }

  get departmentsHiringCount(): number {
    const depts = new Set(this.jobs.map(j => (j.department || '').trim().toLowerCase()));
    depts.delete('');
    return depts.size;
  }

  // ─── Actions ───
  setTab(tab: 'overview' | 'jobs' | 'approvals' | 'candidates' | 'interviews') {
    this.activeTab = tab;
  }

  // ─── Interview Actions ───
  async acceptInterviewRequest(req: InterviewRequest): Promise<void> {
    try {
      const oldData = {
        panel_id: req.panel_id,
        interview_id: req.interview_id,
        interviewer_id: req.interviewer_id
      };
      const newData = {
        panel_id: req.panel_id,
        interview_id: req.interview_id,
        interviewer_id: req.interviewer_id,
        interviewer_name: req.interviewer_name,
        temp1: 'accepted'
      };
      await this.dashboardService.updateInterviewPanel(oldData, newData);
      req.accepted = true;
      this.myInterviewRequests = this.myInterviewRequests.filter(r => r.panel_id !== req.panel_id);
      this.myAcceptedInterviews = [...this.myAcceptedInterviews, req];
      this.showToast2('Interview request accepted!', 'success');
    } catch (error) {
      console.error('Failed to accept interview:', error);
      this.showToast2('Failed to accept interview request.', 'error');
    }
  }

  // ─── Delegation ───
  openDelegateModal(req: InterviewRequest): void {
    this.delegatingRequest = req;
    this.delegateEmployeeId = '';
    this.delegateReason = '';
    this.showDelegateModal = true;
  }

  closeDelegateModal(): void {
    this.showDelegateModal = false;
    this.delegatingRequest = null;
  }

  get delegateEmployeeOptions(): Employee[] {
    const loggedInId = sessionStorage.getItem('employeeId') || '';
    return this.employees.filter(e =>
      e.employee_id.toLowerCase() !== loggedInId.toLowerCase() &&
      (e.status || '').toUpperCase() === 'ACTIVE'
    );
  }

  async confirmDelegate(): Promise<void> {
    if (!this.delegatingRequest || !this.delegateEmployeeId) return;
    this.isDelegating = true;
    try {
      const oldData = {
        panel_id: this.delegatingRequest.panel_id,
        interview_id: this.delegatingRequest.interview_id,
        interviewer_id: this.delegatingRequest.interviewer_id
      };
      const newData = {
        panel_id: this.delegatingRequest.panel_id,
        interview_id: this.delegatingRequest.interview_id,
        interviewer_id: this.delegatingRequest.interviewer_id,
        interviewer_name: this.delegatingRequest.interviewer_name,
        temp1: 'delegated'
      };
      await this.dashboardService.updateInterviewPanel(oldData, newData);

      const delegateEmp = this.employees.find(e => e.employee_id === this.delegateEmployeeId);
      await this.dashboardService.createInterviewPanelEntry({
        interview_id: this.delegatingRequest.interview_id,
        interviewer_id: this.delegateEmployeeId,
        interviewer_name: delegateEmp?.employee_name || '',
        temp1: 'pending'
      });

      // Delegation record — wrap separately so panel changes aren't lost
      try {
        const loggedInId = this.loggedInEmployeeId;
        const delegationData = {
          original_interviewer_id: loggedInId,
          delegate_interviewer_id: this.delegateEmployeeId,
          start_date: this.delegatingRequest.scheduled_date || new Date().toISOString().split('T')[0],
          end_date: this.delegatingRequest.scheduled_date || new Date().toISOString().split('T')[0],
          reason: this.delegateReason || 'Delegated via leadership dashboard'
        };
        console.log('[Dashboard] Delegation payload:', JSON.stringify(delegationData));
        const result = await this.dashboardService.createDelegation(delegationData);
        console.log('[Dashboard] Delegation insert result:', result);
      } catch (delegationError: any) {
        console.error('[Dashboard] Delegation record insert FAILED:', delegationError);
        console.error('[Dashboard] Error details:', JSON.stringify(delegationError, Object.getOwnPropertyNames(delegationError)));
        this.showToast2('Delegation record failed: ' + (delegationError?.message || delegationError?.statusText || 'Check console'), 'error');
      }

      this.myInterviewRequests = this.myInterviewRequests.filter(r => r.panel_id !== this.delegatingRequest!.panel_id);
      this.closeDelegateModal();
      this.showToast2('Interview delegated successfully!', 'success');
    } catch (error) {
      console.error('Failed to delegate:', error);
      this.showToast2('Failed to delegate interview.', 'error');
    } finally {
      this.isDelegating = false;
    }
  }

  // ─── Interview Detail ───
  openInterviewDetail(interview: InterviewRequest): void {
    this.selectedInterview = interview;
    this.feedbackText = interview.feedback || '';
    this.feedbackRating = interview.rating || 0;
    this.technicalSkills = (interview as any).temp2 || '';
    this.communicationSkills = (interview as any).temp3 || '';
    this.culturalFit = (interview as any).temp4 || '';
    this.anotherInterviewRequired = (interview as any).temp5 || '';
  }

  closeInterviewDetail(): void {
    this.selectedInterview = null;
  }

  setRating(rating: number): void {
    this.feedbackRating = rating;
  }

  async submitFeedback(): Promise<void> {
    if (!this.selectedInterview) return;
    if (this.feedbackRating < 1 || this.feedbackRating > 5) {
      this.showToast2('Please provide a rating between 1 and 5.', 'error');
      return;
    }
    if (!this.feedbackText.trim()) {
      this.showToast2('Please provide your feedback.', 'error');
      return;
    }
    this.isSubmittingFeedback = true;
    try {
      const oldData = {
        panel_id: this.selectedInterview.panel_id,
        interview_id: this.selectedInterview.interview_id,
        interviewer_id: this.selectedInterview.interviewer_id
      };
      const newData = {
        ...oldData,
        interviewer_name: this.selectedInterview.interviewer_name,
        feedback: this.feedbackText,
        rating: this.feedbackRating,
        temp1: 'accepted',
        temp2: this.technicalSkills,
        temp3: this.communicationSkills,
        temp4: this.culturalFit,
        temp5: this.anotherInterviewRequired
      };
      await this.dashboardService.updateInterviewPanel(oldData, newData);
      const panelId = this.selectedInterview.panel_id;
      this.myAcceptedInterviews = this.myAcceptedInterviews.filter(i => i.panel_id !== panelId);
      this.showToast2('Feedback submitted successfully!', 'success');
      this.closeInterviewDetail();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      this.showToast2('Failed to submit feedback.', 'error');
    } finally {
      this.isSubmittingFeedback = false;
    }
  }

  getInterviewStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return 'status-active';
      case 'SCHEDULED': case 'IN_PROGRESS': return 'status-in-progress';
      case 'PENDING': return 'status-pending';
      case 'CANCELLED': return 'status-on-leave';
      default: return 'status-pending';
    }
  }

  // ─── Job Requisition Confirm Modal Actions ───
  openJrConfirmModal(jr: JobRequisition, action: 'approve' | 'reject') {
    this.selectedRequisition = jr;
    this.jrConfirmAction = action;
    this.jrRejectRemarks = '';
    this.showJrConfirmModal = true;
  }

  closeJrConfirmModal() {
    this.showJrConfirmModal = false;
    this.selectedRequisition = null;
    this.jrRejectRemarks = '';
  }

  async confirmJrAction(): Promise<void> {
    if (!this.selectedRequisition) return;
    if (this.jrConfirmAction === 'reject' && !this.jrRejectRemarks.trim()) {
      this.showToast2('Please provide remarks for rejection.', 'error');
      return;
    }
    const jr = this.selectedRequisition;
    this.showJrConfirmModal = false;

    if (this.jrConfirmAction === 'approve') {
      await this.approveRequisition(jr);
    } else {
      await this.rejectRequisition(jr, this.jrRejectRemarks.trim());
    }
    this.selectedRequisition = null;
    this.jrRejectRemarks = '';
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
      this.showToast2(`Job requisition ${jr.jr_id} approved successfully!`, 'success');
    } catch (error) {
      console.error('Failed to approve requisition:', error);
      this.showToast2('Failed to approve requisition. Please try again.', 'error');
    }
  }

  async rejectRequisition(jr: JobRequisition, remarks: string = ''): Promise<void> {
    try {
      const oldData = { ...jr };
      const newData = { ...jr, status: 'INACTIVE', approval_status: 'REJECTED', temp1: remarks, temp2: 'NOTIFIED' };
      await this.dashboardService.updateJobRequisition(oldData, newData);

      // Update local state immediately
      jr.status = 'INACTIVE';
      jr.approval_status = 'REJECTED';
      this.pendingApprovals = this.pendingApprovals.filter(a => a.jr_id !== jr.jr_id);
      this.showToast2(`Job requisition ${jr.jr_id} has been rejected.`, 'success');
    } catch (error) {
      console.error('Failed to reject requisition:', error);
      this.showToast2('Failed to reject requisition. Please try again.', 'error');
    }
  }

  getPriorityClass(priority: string): string {
    switch ((priority || '').toUpperCase()) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'ACTIVE': case 'APPROVED': case 'COMPLETED': case 'OPEN': return 'status-active';
      case 'IN_PROGRESS': case 'SCHEDULED': return 'status-in-progress';
      case 'PENDING': case 'DRAFT': return 'status-pending';
      case 'ON_LEAVE': case 'CLOSED': case 'REJECTED': return 'status-on-leave';
      default: return '';
    }
  }

  getCandidateCountForJob(jrId: string): number {
    // Count from candidateApplications (actual applications) rather than candidate master list
    const fromApps = this.candidateApplications.filter((a: any) => a.jr_id === jrId).length;
    if (fromApps > 0) return fromApps;
    // Fallback to candidate master data
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
    this.showApproveConfirmModal = false;
    this.showOfferDetailModal = false;

    try {
      const offerId = this.selectedOffer.offer_id;
      if (!offerId) {
        this.showToast2('Offer ID not found. Cannot update status.', 'error');
        return;
      }
      const todayDate = new Date().toISOString().split('T')[0];
      await this.dashboardService.approveOfferStatus(offerId, 'APPROVED', todayDate);

      // Update local state
      this.selectedOffer.approval_status = 'APPROVED';
      this.selectedOffer.offer_status = 'APPROVED';
      this.offeredCandidates = this.offeredCandidates.filter((c: any) => c.offer_id !== offerId);

      this.showToast2('Offer approved! HR will send the offer letter to the candidate.', 'success');
      this.selectedOffer = null;
    } catch (e) {
      console.error('[Leadership] Error approving offer:', e);
      this.showToast2('Failed to approve offer. Please try again.', 'error');
    }
  }

  // ─── Offer Confirm Modal Actions ───
  openOfferConfirmModal(offer: any, action: 'approve' | 'suggest_changes') {
    this.selectedOfferForConfirm = offer;
    this.offerConfirmAction = action;
    this.offerSuggestChangesText = '';
    this.showOfferConfirmModal = true;
  }

  closeOfferConfirmModal() {
    this.showOfferConfirmModal = false;
    this.selectedOfferForConfirm = null;
  }

  async confirmOfferAction() {
    if (!this.selectedOfferForConfirm) return;

    if (this.offerConfirmAction === 'suggest_changes' && !this.offerSuggestChangesText.trim()) {
      this.showToast2('Please provide your suggested changes.', 'error');
      return;
    }

    const offer = this.selectedOfferForConfirm;
    this.showOfferConfirmModal = false;

    if (this.offerConfirmAction === 'approve') {
      this.selectedOffer = offer;
      await this.confirmApproveOffer();
    } else {
      this.selectedOffer = offer;
      await this.suggestOfferChanges();
    }
    this.selectedOfferForConfirm = null;
    this.offerSuggestChangesText = '';
  }

  async suggestOfferChanges() {
    if (!this.selectedOffer || this.isProcessingOffer) return;
    this.isProcessingOffer = true;

    try {
      const offerId = this.selectedOffer.offer_id;
      if (!offerId) {
        this.showToast2('Offer ID not found.', 'error');
        this.isProcessingOffer = false;
        return;
      }
      await this.dashboardService.suggestOfferChanges(offerId, this.offerSuggestChangesText.trim(), {
        candidate_id: this.selectedOffer.candidate_id,
        jr_id: this.selectedOffer.jr_id,
        offer_date: this.selectedOffer.offer_date || '',
        date_of_joining: this.selectedOffer.date_of_joining || '',
        salary_offered: this.selectedOffer.salary_offered || '',
        offer_letter_path: this.selectedOffer.offer_letter_path || '',
        offer_sent_date: '',
        candidate_response_date: ''
      });

      this.selectedOffer.approval_status = 'CHANGES_SUGGESTED';
      this.selectedOffer.offer_status = 'CHANGES_SUGGESTED';
      this.offeredCandidates = this.offeredCandidates.filter((c: any) => c.offer_id !== offerId);

      this.showToast2('Suggested changes sent to HR successfully.', 'success');
      this.closeOfferDetailModal();
    } catch (e) {
      console.error('[Leadership] Error suggesting changes:', e);
      this.showToast2('Failed to suggest changes. Please try again.', 'error');
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
