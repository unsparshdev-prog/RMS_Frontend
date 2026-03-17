import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

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
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts: () => import('echarts') })],
  templateUrl: './leadership-dashboard.component.html',
  styleUrls: ['./leadership-dashboard.component.css']
})
export class LeadershipDashboardComponent {
  activeTab: 'overview' | 'jobs' | 'employees' | 'approvals' | 'candidates' = 'overview';

  constructor(private router: Router) {}

  // Chart options
  deptChartOptions: EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Engineering', 'Product', 'Data & Analytics', 'Design'],
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
      data: [6, 1, 2, 2],
      barWidth: '45%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: '#00C4F0' }, { offset: 1, color: '#0B2265' }
        ]}
      }
    }]
  };

  pipelineChartOptions: EChartsOption = {
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
      data: [
        { value: 5, name: 'In Progress', itemStyle: { color: '#0B2265' } },
        { value: 3, name: 'Scheduled', itemStyle: { color: '#00C4F0' } },
        { value: 2, name: 'Completed', itemStyle: { color: '#27ae60' } }
      ]
    }]
  };

  priorityChartOptions: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} jobs' },
    legend: { bottom: '0', textStyle: { color: '#4a5d75', fontSize: 11 } },
    series: [{
      type: 'pie',
      radius: '65%',
      center: ['50%', '42%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { color: '#4a5d75', fontSize: 11 },
      data: [
        { value: 3, name: 'High', itemStyle: { color: '#e74c3c' } },
        { value: 2, name: 'Medium', itemStyle: { color: '#FF6B35' } },
        { value: 1, name: 'Low', itemStyle: { color: '#00C4F0' } }
      ]
    }]
  };

  hiringTrendOptions: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
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
        data: [3, 5, 4, 6, 4, 6],
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
        data: [2, 3, 3, 4, 5, 4],
        lineStyle: { color: '#00C4F0', width: 3 },
        itemStyle: { color: '#00C4F0' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(0,196,240,0.15)' }, { offset: 1, color: 'rgba(0,196,240,0)' }
        ]}}
      }
    ]
  };

  // Search & filter
  jobSearch = '';
  employeeSearch = '';
  candidateSearch = '';
  departmentFilter = '';
  selectedJobForCandidates = '';

  // Mock Data
  jobs: JobRequisition[] = [
    {
      jr_id: 'JR001', job_title: 'Senior Frontend Developer', department: 'Engineering',
      location: 'Remote', job_description: 'Build modern web applications using Angular',
      required_skills: 'Angular, TypeScript, TailwindCSS', min_experience: 5, max_experience: 8,
      salary_range: '$120K - $160K', no_of_positions: 3, priority: 'HIGH', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-04-30', created_at: '2026-03-01', created_by: 'Admin'
    },
    {
      jr_id: 'JR002', job_title: 'Backend Engineer', department: 'Engineering',
      location: 'New York, NY', job_description: 'Design and build scalable APIs',
      required_skills: 'Java, Spring Boot, PostgreSQL', min_experience: 3, max_experience: 6,
      salary_range: '$100K - $140K', no_of_positions: 2, priority: 'MEDIUM', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-05-15', created_at: '2026-03-05', created_by: 'Admin'
    },
    {
      jr_id: 'JR003', job_title: 'Product Manager', department: 'Product',
      location: 'San Francisco, CA', job_description: 'Lead product strategy and roadmap',
      required_skills: 'Product Strategy, Agile, Data Analysis', min_experience: 7, max_experience: 12,
      salary_range: '$140K - $180K', no_of_positions: 1, priority: 'HIGH', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-04-20', created_at: '2026-02-28', created_by: 'Admin'
    },
    {
      jr_id: 'JR004', job_title: 'Data Scientist', department: 'Data & Analytics',
      location: 'Remote', job_description: 'Build ML models and analytics pipelines',
      required_skills: 'Python, TensorFlow, SQL, Statistics', min_experience: 4, max_experience: 8,
      salary_range: '$130K - $170K', no_of_positions: 2, priority: 'MEDIUM', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-05-01', created_at: '2026-03-10', created_by: 'Admin'
    },
    {
      jr_id: 'JR005', job_title: 'DevOps Engineer', department: 'Engineering',
      location: 'Seattle, WA', job_description: 'Manage CI/CD and cloud infrastructure',
      required_skills: 'AWS, Docker, Kubernetes, Terraform', min_experience: 4, max_experience: 7,
      salary_range: '$115K - $155K', no_of_positions: 1, priority: 'LOW', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-06-01', created_at: '2026-03-12', created_by: 'Admin'
    },
    {
      jr_id: 'JR006', job_title: 'UX Designer', department: 'Design',
      location: 'Austin, TX', job_description: 'Design beautiful user experiences',
      required_skills: 'Figma, User Research, Prototyping', min_experience: 3, max_experience: 6,
      salary_range: '$90K - $120K', no_of_positions: 2, priority: 'HIGH', status: 'ACTIVE',
      approval_status: 'APPROVED', closing_date: '2026-04-25', created_at: '2026-03-08', created_by: 'Admin'
    }
  ];

  pendingApprovals: JobRequisition[] = [
    {
      jr_id: 'JR007', job_title: 'Head of Marketing', department: 'Marketing',
      location: 'New York, NY', job_description: 'Lead the marketing department and strategy',
      required_skills: 'Digital Marketing, Brand Strategy, Team Leadership', min_experience: 10, max_experience: 15,
      salary_range: '$160K - $200K', no_of_positions: 1, priority: 'HIGH', status: 'DRAFT',
      approval_status: 'PENDING', closing_date: '2026-05-20', created_at: '2026-03-14', created_by: 'Sarah Chen'
    },
    {
      jr_id: 'JR008', job_title: 'Security Engineer', department: 'Engineering',
      location: 'Remote', job_description: 'Implement and maintain security infrastructure',
      required_skills: 'Cybersecurity, Penetration Testing, SIEM', min_experience: 5, max_experience: 9,
      salary_range: '$125K - $165K', no_of_positions: 2, priority: 'HIGH', status: 'DRAFT',
      approval_status: 'PENDING', closing_date: '2026-05-30', created_at: '2026-03-15', created_by: 'Marcus Johnson'
    },
    {
      jr_id: 'JR009', job_title: 'Technical Writer', department: 'Product',
      location: 'Remote', job_description: 'Create technical documentation and API guides',
      required_skills: 'Technical Writing, API Documentation, Markdown', min_experience: 2, max_experience: 5,
      salary_range: '$70K - $95K', no_of_positions: 1, priority: 'LOW', status: 'DRAFT',
      approval_status: 'PENDING', closing_date: '2026-06-15', created_at: '2026-03-16', created_by: 'Emily Rodriguez'
    },
    {
      jr_id: 'JR010', job_title: 'QA Lead', department: 'Engineering',
      location: 'San Francisco, CA', job_description: 'Lead quality assurance team and testing strategy',
      required_skills: 'Test Automation, Selenium, CI/CD, Leadership', min_experience: 6, max_experience: 10,
      salary_range: '$110K - $145K', no_of_positions: 1, priority: 'MEDIUM', status: 'DRAFT',
      approval_status: 'PENDING', closing_date: '2026-05-25', created_at: '2026-03-15', created_by: 'Admin'
    }
  ];

  employees: Employee[] = [
    { employee_id: 'EMP001', employee_name: 'Aarav Sharma', email: 'aarav.sharma@company.com', phone: '+1-555-0101', department: 'Engineering', designation: 'Senior Developer', role: 'DEVELOPER', joining_date: '2023-01-15', status: 'ACTIVE' },
    { employee_id: 'EMP002', employee_name: 'Priya Patel', email: 'priya.patel@company.com', phone: '+1-555-0102', department: 'Engineering', designation: 'Tech Lead', role: 'LEAD', joining_date: '2022-06-01', status: 'ACTIVE' },
    { employee_id: 'EMP003', employee_name: 'Rahul Mehta', email: 'rahul.mehta@company.com', phone: '+1-555-0103', department: 'Product', designation: 'Product Manager', role: 'MANAGER', joining_date: '2022-03-20', status: 'ACTIVE' },
    { employee_id: 'EMP004', employee_name: 'Sneha Gupta', email: 'sneha.gupta@company.com', phone: '+1-555-0104', department: 'Design', designation: 'UX Designer', role: 'DESIGNER', joining_date: '2023-05-10', status: 'ACTIVE' },
    { employee_id: 'EMP005', employee_name: 'Vikram Singh', email: 'vikram.singh@company.com', phone: '+1-555-0105', department: 'Data & Analytics', designation: 'Data Engineer', role: 'DEVELOPER', joining_date: '2023-08-01', status: 'ACTIVE' },
    { employee_id: 'EMP006', employee_name: 'Ananya Reddy', email: 'ananya.reddy@company.com', phone: '+1-555-0106', department: 'Marketing', designation: 'Marketing Specialist', role: 'SPECIALIST', joining_date: '2024-01-08', status: 'ACTIVE' },
    { employee_id: 'EMP007', employee_name: 'Karan Joshi', email: 'karan.joshi@company.com', phone: '+1-555-0107', department: 'Engineering', designation: 'DevOps Engineer', role: 'DEVELOPER', joining_date: '2023-11-15', status: 'ACTIVE' },
    { employee_id: 'EMP008', employee_name: 'Meera Nair', email: 'meera.nair@company.com', phone: '+1-555-0108', department: 'HR', designation: 'HR Manager', role: 'MANAGER', joining_date: '2021-09-01', status: 'ACTIVE' },
    { employee_id: 'EMP009', employee_name: 'Arjun Kapoor', email: 'arjun.kapoor@company.com', phone: '+1-555-0109', department: 'Engineering', designation: 'Junior Developer', role: 'DEVELOPER', joining_date: '2025-02-01', status: 'ACTIVE' },
    { employee_id: 'EMP010', employee_name: 'Divya Iyer', email: 'divya.iyer@company.com', phone: '+1-555-0110', department: 'Finance', designation: 'Financial Analyst', role: 'ANALYST', joining_date: '2024-04-15', status: 'ACTIVE' },
    { employee_id: 'EMP011', employee_name: 'Rohan Desai', email: 'rohan.desai@company.com', phone: '+1-555-0111', department: 'Engineering', designation: 'Full Stack Developer', role: 'DEVELOPER', joining_date: '2023-07-20', status: 'ACTIVE' },
    { employee_id: 'EMP012', employee_name: 'Kavita Saxena', email: 'kavita.saxena@company.com', phone: '+1-555-0112', department: 'Product', designation: 'Business Analyst', role: 'ANALYST', joining_date: '2024-06-01', status: 'ON_LEAVE' }
  ];

  candidates: Candidate[] = [
    { candidate_id: 'CAN001', name: 'Alex Thompson', email: 'alex.t@email.com', phone: '+1-555-1001', skills: 'Angular, React, TypeScript', experience: 6, education: 'B.S. Computer Science', source: 'LinkedIn', notice_period: 30, expected_salary: 145000, linkedin_url: 'linkedin.com/in/alexthompson', jr_id: 'JR001', job_title: 'Senior Frontend Developer', interview_status: 'IN_PROGRESS', interview_round: 'Technical Round 2' },
    { candidate_id: 'CAN002', name: 'Maria Garcia', email: 'maria.g@email.com', phone: '+1-555-1002', skills: 'Angular, Vue.js, CSS', experience: 5, education: 'M.S. Software Engineering', source: 'Referral', notice_period: 60, expected_salary: 135000, linkedin_url: 'linkedin.com/in/mariagarcia', jr_id: 'JR001', job_title: 'Senior Frontend Developer', interview_status: 'SCHEDULED', interview_round: 'HR Round' },
    { candidate_id: 'CAN003', name: 'James Wilson', email: 'james.w@email.com', phone: '+1-555-1003', skills: 'Java, Spring Boot, Microservices', experience: 4, education: 'B.S. Computer Science', source: 'Indeed', notice_period: 30, expected_salary: 120000, linkedin_url: 'linkedin.com/in/jameswilson', jr_id: 'JR002', job_title: 'Backend Engineer', interview_status: 'IN_PROGRESS', interview_round: 'Technical Round 1' },
    { candidate_id: 'CAN004', name: 'Sarah Kim', email: 'sarah.k@email.com', phone: '+1-555-1004', skills: 'Product Strategy, Scrum, Jira', experience: 9, education: 'MBA', source: 'LinkedIn', notice_period: 45, expected_salary: 165000, linkedin_url: 'linkedin.com/in/sarahkim', jr_id: 'JR003', job_title: 'Product Manager', interview_status: 'COMPLETED', interview_round: 'Final Round' },
    { candidate_id: 'CAN005', name: 'David Chen', email: 'david.c@email.com', phone: '+1-555-1005', skills: 'Python, TensorFlow, PyTorch, SQL', experience: 5, education: 'Ph.D. Data Science', source: 'Career Page', notice_period: 30, expected_salary: 155000, linkedin_url: 'linkedin.com/in/davidchen', jr_id: 'JR004', job_title: 'Data Scientist', interview_status: 'SCHEDULED', interview_round: 'Technical Round 1' },
    { candidate_id: 'CAN006', name: 'Emily Davis', email: 'emily.d@email.com', phone: '+1-555-1006', skills: 'React, TypeScript, Node.js', experience: 7, education: 'B.S. Information Technology', source: 'Referral', notice_period: 30, expected_salary: 150000, linkedin_url: 'linkedin.com/in/emilydavis', jr_id: 'JR001', job_title: 'Senior Frontend Developer', interview_status: 'IN_PROGRESS', interview_round: 'Technical Round 1' },
    { candidate_id: 'CAN007', name: 'Michael Brown', email: 'michael.b@email.com', phone: '+1-555-1007', skills: 'AWS, Kubernetes, Docker, Jenkins', experience: 5, education: 'B.S. Computer Engineering', source: 'LinkedIn', notice_period: 60, expected_salary: 140000, linkedin_url: 'linkedin.com/in/michaelbrown', jr_id: 'JR005', job_title: 'DevOps Engineer', interview_status: 'SCHEDULED', interview_round: 'HR Round' },
    { candidate_id: 'CAN008', name: 'Lisa Wang', email: 'lisa.w@email.com', phone: '+1-555-1008', skills: 'Figma, Adobe XD, User Research', experience: 4, education: 'B.F.A. Graphic Design', source: 'Dribbble', notice_period: 15, expected_salary: 105000, linkedin_url: 'linkedin.com/in/lisawang', jr_id: 'JR006', job_title: 'UX Designer', interview_status: 'IN_PROGRESS', interview_round: 'Portfolio Review' },
    { candidate_id: 'CAN009', name: 'Robert Taylor', email: 'robert.t@email.com', phone: '+1-555-1009', skills: 'Java, Python, PostgreSQL, Redis', experience: 5, education: 'M.S. Computer Science', source: 'Indeed', notice_period: 30, expected_salary: 130000, linkedin_url: 'linkedin.com/in/roberttaylor', jr_id: 'JR002', job_title: 'Backend Engineer', interview_status: 'COMPLETED', interview_round: 'Final Round' },
    { candidate_id: 'CAN010', name: 'Jennifer Lee', email: 'jennifer.l@email.com', phone: '+1-555-1010', skills: 'Python, R, Tableau, Machine Learning', experience: 6, education: 'M.S. Statistics', source: 'LinkedIn', notice_period: 45, expected_salary: 160000, linkedin_url: 'linkedin.com/in/jenniferlee', jr_id: 'JR004', job_title: 'Data Scientist', interview_status: 'IN_PROGRESS', interview_round: 'Technical Round 2' }
  ];

  // Computed properties
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
    );
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

  // Actions
  setTab(tab: 'overview' | 'jobs' | 'employees' | 'approvals' | 'candidates') {
    this.activeTab = tab;
  }

  approveRequisition(jr: JobRequisition) {
    jr.approval_status = 'APPROVED';
    jr.status = 'ACTIVE';
    this.jobs.push({...jr});
    this.pendingApprovals = this.pendingApprovals.filter(a => a.jr_id !== jr.jr_id);
  }

  rejectRequisition(jr: JobRequisition) {
    jr.approval_status = 'REJECTED';
    this.pendingApprovals = this.pendingApprovals.filter(a => a.jr_id !== jr.jr_id);
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
      case 'ACTIVE': case 'APPROVED': case 'COMPLETED': return 'status-active';
      case 'IN_PROGRESS': case 'SCHEDULED': return 'status-in-progress';
      case 'PENDING': case 'DRAFT': return 'status-pending';
      case 'ON_LEAVE': return 'status-on-leave';
      default: return '';
    }
  }

  getCandidateCountForJob(jrId: string): number {
    return this.candidates.filter(c => c.jr_id === jrId).length;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
