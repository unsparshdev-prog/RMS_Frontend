import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { LeadershipDashboardService } from './leadership-dashboard.service';

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

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Fetch all data in parallel
      // Try getAllJobRequisitions first (includes pending); fallback to ShowAll
      const [jobsResp, employeesResp, candidatesResp, interviewsResp, offersResp] = await Promise.all([
        this.dashboardService.getAllJobRequisitions(),
        this.dashboardService.getEmployees(),
        this.dashboardService.getCandidates(),
        this.dashboardService.getInterviews(),
        this.dashboardService.getOffers()
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
    const statusMap: Record<string, number> = {};
    this.candidates.forEach(c => {
      const s = c.interview_status || 'Unknown';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const colorMap: Record<string, string> = {
      'IN_PROGRESS': '#0B2265',
      'SCHEDULED': '#00C4F0',
      'COMPLETED': '#27ae60',
      'PENDING': '#f39c12',
      'REJECTED': '#e74c3c'
    };
    const data = Object.entries(statusMap).map(([name, value]) => ({
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

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
