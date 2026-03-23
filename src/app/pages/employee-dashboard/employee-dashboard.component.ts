import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EmployeeDashboardService } from './employee-dashboard.service';

interface InterviewRequest {
  panel_id: string;
  interview_id: string;
  interviewer_id: string;
  interviewer_name: string;
  feedback: string;
  rating: number;
  // Enriched data
  candidate_name: string;
  candidate_email: string;
  candidate_id: string;
  candidate_skills: string;
  candidate_experience: number;
  candidate_resume_path: string;
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
}

interface Referral {
  referral_id: string;
  employee_id: string;
  candidate_id: string;
  jr_id: string;
  referral_status: string;
  created_at: string;
  // Enriched
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  job_department: string;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit {
  activeTab: 'requests' | 'interviews' | 'referrals' | 'profile' = 'profile';

  // Loading & error
  isLoading = true;
  errorMessage = '';

  // Logged-in user info
  loggedInUserName = 'Employee';
  loggedInUserInitial = 'E';
  loggedInUserRole = 'Employee';
  loggedInEmployeeId = '';
  employeeProfile: any = null;

  // Data
  interviewRequests: InterviewRequest[] = [];
  myInterviews: InterviewRequest[] = [];
  referrals: Referral[] = [];
  allEmployees: any[] = [];

  // Delegation modal
  showDelegateModal = false;
  delegatingRequest: InterviewRequest | null = null;
  delegateEmployeeId = '';
  delegateReason = '';
  isDelegating = false;

  // Detail panel
  selectedInterview: InterviewRequest | null = null;

  // Feedback
  feedbackText = '';
  feedbackRating = 0;
  isSubmittingFeedback = false;

  constructor(
    private router: Router,
    private empService: EmployeeDashboardService
  ) {}

  ngOnInit(): void {
    this.loggedInEmployeeId = sessionStorage.getItem('employeeId') || '';
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      // Step 1: Load employees first to resolve the actual employee_id
      const [employees, interviews, candidates, jobs] = await Promise.all([
        this.empService.getEmployees(),
        this.empService.getAllInterviews(),
        this.empService.getAllCandidates(),
        this.empService.getAllJobRequisitions()
      ]);

      this.allEmployees = employees;

      // Resolve logged-in user profile — match by employee_id, email, or employee_name
      const loginId = this.loggedInEmployeeId.toLowerCase();
      const me = employees.find((e: any) =>
        (e.employee_id || '').toLowerCase() === loginId ||
        (e.email || '').toLowerCase() === loginId ||
        (e.employee_name || '').toLowerCase() === loginId
      );
      if (me) {
        this.loggedInUserName = me.employee_name || 'Employee';
        this.loggedInUserInitial = (me.employee_name || 'E').charAt(0).toUpperCase();
        this.loggedInUserRole = me.designation || me.role || 'Employee';
        this.employeeProfile = me;
        // Use the actual employee_id from DB for all further queries
        this.loggedInEmployeeId = me.employee_id;
        console.log('[EmployeeDashboard] Resolved employee_id:', this.loggedInEmployeeId);
      } else {
        console.warn('[EmployeeDashboard] Could not resolve employee for loginId:', this.loggedInEmployeeId);
      }

      // Step 2: Now load panels and referrals with the resolved employee_id
      const [panels, referrals] = await Promise.all([
        this.empService.getInterviewPanelForInterviewer(this.loggedInEmployeeId),
        this.empService.getMyReferrals(this.loggedInEmployeeId)
      ]);

      console.log('[EmployeeDashboard] loggedInEmployeeId:', this.loggedInEmployeeId);
      console.log('[EmployeeDashboard] panels returned:', panels.length, panels);
      console.log('[EmployeeDashboard] interviews returned:', interviews.length);
      console.log('[EmployeeDashboard] candidates returned:', candidates.length);

      // Build enriched interview requests
      const enrichedPanels: InterviewRequest[] = panels.map((p: any) => {
        const interview = interviews.find((i: any) => i.interview_id === p.interview_id) || {};
        const candidate = candidates.find((c: any) => c.candidate_id === interview.candidate_id) || {};
        const job = jobs.find((j: any) => j.jr_id === interview.jr_id) || {};

        // Determine status from temp1 field
        const temp1 = (p.temp1 || '').toUpperCase();
        const accepted = temp1 === 'ACCEPTED';
        const delegated = temp1 === 'DELEGATED';

        console.log('[EmployeeDashboard] Panel:', p.panel_id, 'temp1:', p.temp1, '-> accepted:', accepted, 'delegated:', delegated);

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
          candidate_resume_path: candidate.resume_path || '',
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
          _delegated: delegated
        } as any;
      });

      // Separate pending vs accepted (ignore delegated)
      this.interviewRequests = enrichedPanels.filter(r => !r.accepted && !(r as any)._delegated);
      this.myInterviews = enrichedPanels.filter(r => r.accepted);
      console.log('[EmployeeDashboard] Interview Requests (pending):', this.interviewRequests.length);
      console.log('[EmployeeDashboard] My Interviews (accepted):', this.myInterviews.length);

      // Build enriched referrals
      this.referrals = referrals.map((r: any) => {
        const candidate = candidates.find((c: any) => c.candidate_id === r.candidate_id) || {};
        const job = jobs.find((j: any) => j.jr_id === r.jr_id) || {};
        return {
          referral_id: r.referral_id || '',
          employee_id: r.employee_id || '',
          candidate_id: r.candidate_id || '',
          jr_id: r.jr_id || '',
          referral_status: r.referral_status || 'PENDING',
          created_at: r.created_at || '',
          candidate_name: candidate.name || '',
          candidate_email: candidate.email || '',
          job_title: job.job_title || '',
          job_department: job.department || ''
        };
      });

    } catch (error: any) {
      console.error('EmployeeDashboard: failed to load data', error);
      this.errorMessage = 'Failed to load dashboard data. Please check your connection and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // ─── Tab switching ───
  setTab(tab: 'requests' | 'interviews' | 'referrals' | 'profile'): void {
    this.activeTab = tab;
  }

  // ─── Accept Interview Request ───
  async acceptRequest(req: InterviewRequest): Promise<void> {
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
        temp1: 'ACCEPTED'
      };
      await this.empService.updateInterviewPanel(oldData, newData);

      // Move from requests to interviews locally
      req.accepted = true;
      this.interviewRequests = this.interviewRequests.filter(r => r.panel_id !== req.panel_id);
      this.myInterviews = [...this.myInterviews, req];
    } catch (error) {
      console.error('Failed to accept interview:', error);
      alert('Failed to accept interview request. Please try again.');
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

  get delegateEmployeeOptions(): any[] {
    return this.allEmployees.filter(e =>
      e.employee_id !== this.loggedInEmployeeId &&
      e.status === 'ACTIVE'
    );
  }

  async confirmDelegate(): Promise<void> {
    if (!this.delegatingRequest || !this.delegateEmployeeId) return;

    this.isDelegating = true;
    try {
      // 1. Mark the original interviewer's row as DELEGATED
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
        temp1: 'DELEGATED'
      };
      await this.empService.updateInterviewPanel(oldData, newData);

      // 2. Create a new entry for the delegate employee with temp1 = PENDING
      const delegateEmp = this.allEmployees.find(e => e.employee_id === this.delegateEmployeeId);
      await this.empService.createInterviewPanelEntry({
        interview_id: this.delegatingRequest.interview_id,
        interviewer_id: this.delegateEmployeeId,
        interviewer_name: delegateEmp?.employee_name || '',
        temp1: 'PENDING'
      });

      // 3. Insert record into interviewer_delegation table
      await this.empService.createDelegation({
        original_interviewer_id: this.loggedInEmployeeId,
        delegate_interviewer_id: this.delegateEmployeeId,
        start_date: this.delegatingRequest.scheduled_date || new Date().toISOString().split('T')[0],
        end_date: this.delegatingRequest.scheduled_date || new Date().toISOString().split('T')[0],
        reason: this.delegateReason || 'Delegated via dashboard'
      });

      // Remove from local list
      this.interviewRequests = this.interviewRequests.filter(r => r.panel_id !== this.delegatingRequest!.panel_id);
      this.closeDelegateModal();
    } catch (error) {
      console.error('Failed to delegate:', error);
      alert('Failed to delegate interview. Please try again.');
    } finally {
      this.isDelegating = false;
    }
  }

  // ─── Interview Detail ───
  openInterviewDetail(interview: InterviewRequest): void {
    this.selectedInterview = interview;
    this.feedbackText = interview.feedback || '';
    this.feedbackRating = interview.rating || 0;
  }

  closeInterviewDetail(): void {
    this.selectedInterview = null;
  }

  // ─── Submit Feedback ───
  async submitFeedback(): Promise<void> {
    if (!this.selectedInterview) return;
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
        temp1: 'ACCEPTED'
      };
      await this.empService.updateInterviewPanel(oldData, newData);

      // Update local state
      this.selectedInterview.feedback = this.feedbackText;
      this.selectedInterview.rating = this.feedbackRating;

      // Close the side panel after successful submission
      this.closeInterviewDetail();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      this.isSubmittingFeedback = false;
    }
  }

  setRating(rating: number): void {
    this.feedbackRating = rating;
  }

  // ─── Helpers ───
  getReferralStatusClass(status: string): string {
    switch (status) {
      case 'HIRED': case 'SELECTED': return 'status-active';
      case 'IN_PROGRESS': case 'INTERVIEW': return 'status-in-progress';
      case 'PENDING': case 'APPLIED': return 'status-pending';
      case 'REJECTED': return 'status-on-leave';
      default: return 'status-pending';
    }
  }

  getInterviewStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status-active';
      case 'SCHEDULED': case 'IN_PROGRESS': return 'status-in-progress';
      case 'PENDING': return 'status-pending';
      case 'CANCELLED': return 'status-on-leave';
      default: return 'status-pending';
    }
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
