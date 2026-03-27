import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../../hero.service';
import { AuthService } from '../../../auth.service';
import { ToastService } from '../../../toast.service';

@Component({
  selector: 'app-apply-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apply-jobs.component.html',
  styleUrls: ['./apply-jobs.component.css']
})
export class ApplyJobsComponent implements OnInit {
  searchQuery = '';
  jobs: any[] = [];
  filteredJobs: any[] = [];

  // Confirmation modal state
  showConfirmModal = false;
  confirmJobId = '';
  confirmJobTitle = '';

  constructor(
    private heroService: HeroService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  async loadJobs(): Promise<void> {
    this.heroService.showAllJobRequisition()
      .then(async resp => {
        // Attempt to find the array of tuples or job requisitions
        let rawData = this.heroService.xmltojson(resp, 'tuple');
        if (!rawData) {
          rawData = this.heroService.xmltojson(resp, 'job_requisition');
        }

        if (rawData) {
          const dataArray = Array.isArray(rawData) ? rawData : [rawData];
          const baseJobs = dataArray.map((item: any) => {
            // Data could be in item.old.job_requisition (standard Cordys tuple)
            // or directly in item if xmltojson found job_requisition array
            const j = item.old?.job_requisition || item.job_requisition || item;
            
            return {
              id: j.jr_id,
              title: j.job_title,
              company: 'RMS',
              location: j.location,
              type: j.status || 'Active', // Mapping status here
              department: j.department,
              salary: j.salary_range || 'Competitive',
              posted: this.calculateTimeAgo(j.created_at),
              description: j.job_description,
              applicationStatus: '',
              isRevoked: false
            };
          }).filter((j: any) => j.id && j.type?.toLowerCase() === 'active'); // Filter for Active marks

          const candidateId = this.authService.getCandidateId();
          if (candidateId) {
            await Promise.all(baseJobs.map(async (job: any) => {
              try {
                const appResp = await this.heroService.getApplicationByCandidateAndJR(candidateId, job.id);
                const existingApp = this.heroService.xmltojson(appResp, 'candidate_job_application');
                if (existingApp) {
                  const appRecord = Array.isArray(existingApp) ? existingApp[0] : existingApp;
                  const rawStatus = (appRecord.application_status || appRecord.stage || '').toString().toUpperCase();
                  job.applicationStatus = rawStatus;
                  job.isRevoked = rawStatus === 'REVOKED';
                }
              } catch (err) {
                console.warn('Failed to resolve application status for job', job.id, err);
              }
            }));
          }

          this.jobs = baseJobs;
          this.filteredJobs = [...this.jobs];
        }
      })
      .catch(err => {
        console.error('Error loading jobs', err);
        this.toast.error('Failed to load job listings. Please try again.');
      });
  }

  calculateTimeAgo(dateStr: string): string {
    if (!dateStr) return 'Just now';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  }

  filterJobs(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q)
    );
  }

  applyForJob(jobId: string): void {
    const candidateId = this.authService.getCandidateId();
    if (!candidateId) {
      this.toast.error('Candidate ID not found. Please log in again.');
      return;
    }

    // Find the job title for the confirmation modal
    const job = this.filteredJobs.find(j => j.id === jobId);
    if (job?.isRevoked) {
      this.toast.warning('You revoked this application. Reapplying is not allowed.');
      return;
    }
    this.confirmJobTitle = job?.title || 'this job';
    this.confirmJobId = jobId;
    this.showConfirmModal = true;
  }

  cancelApply(): void {
    this.showConfirmModal = false;
    this.confirmJobId = '';
    this.confirmJobTitle = '';
  }

  confirmApply(): void {
    this.showConfirmModal = false;
    const candidateId = this.authService.getCandidateId();
    const jobId = this.confirmJobId;
    this.confirmJobId = '';
    this.confirmJobTitle = '';

    // STEP 1: CHECK FOR DUPLICATE APPLICATION
    this.heroService.getApplicationByCandidateAndJR(candidateId, jobId)
      .then(resp => {
        const existingApp = this.heroService.xmltojson(resp, 'candidate_job_application');
        
        // STEP 2: ANALYZE RESPONSE
        if (existingApp) {
          // DUPLICATE EXISTS
          const response = {
            status: "duplicate",
            message: "You have already applied for this job."
          };
          console.log(JSON.stringify(response, null, 2));
          this.toast.warning(response.message);
          return;
        }

        // NO DUPLICATE - STEP 3: CREATE NEW APPLICATION
        const applicationData = {
          candidate_id: candidateId,
          jr_id: jobId,
          application_status: 'APPLIED',
          applied_at: new Date().toISOString(),
          stage: 'Applied'
        };

        const jobTitleForEmail = this.confirmJobTitle;

        this.heroService.updateCandidateJobApplication(applicationData)
          .then(() => {
            // SUCCESS RESPONSE - STEP 4
            const response = {
              status: "success",
              message: "Application submitted successfully."
            };
            console.log(JSON.stringify(response, null, 2));
            this.toast.success(response.message);

            // SEND MAIL FOR JOB APPLIED
            const sessionEmail = sessionStorage.getItem('displayName') || '';
            const subject = `Job Application Received: ${jobTitleForEmail}`;
            const jobDetails = this.filteredJobs.find(j => j.id === jobId);
            const companyName = jobDetails?.company || 'RMS';
            const location = jobDetails?.location || 'Not Specified';

        const buildEmailBody = (candidateName: string, jobTitle: string, jobLocation: string) => `
              <div style="font-family:'Inter', 'Segoe UI', Arial, sans-serif; max-width:650px; margin:0 auto; background-color:#f8faff; border-radius:12px; overflow:hidden; border:1px solid #e1e8ed;">
                <!-- Header with Gradient Area -->
                <div style="background:linear-gradient(135deg,#0B2265 0%,#132d7a 100%); padding:35px 40px; position:relative;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h1 style="color:#fff; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.5px;">Adnate IT Solutions</h1>
                        <p style="color:rgba(255,255,255,0.7); margin:5px 0 0; font-size:12px;">Recruitment Management System (RMS)</p>
                      </td>
                      <td style="text-align:right;">
                        <span style="background:rgba(0,196,240,0.2); color:#00C4F0; padding:8px 16px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Application Received</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Body Content -->
                <div style="background-color:#ffffff; padding:40px; border-bottom:1px solid #e1e8ed;">
                  <h2 style="color:#0B2265; font-size:20px; margin:0 0 15px;">Dear ${candidateName},</h2>
                  <p style="color:#4a5d75; line-height:1.8; font-size:15px; margin-bottom:25px;">
                    Thank you for your interest in joining <strong>Adnate IT Solutions</strong>. We have successfully received your application for the following position:
                  </p>

                  <!-- Application Details Card -->
                  <div style="background:linear-gradient(135deg,#f0f4ff 0%,#e8f7fc 100%); border-radius:12px; padding:25px; margin:25px 0; border:1px solid rgba(0,196,240,0.15);">
                    <h3 style="color:#0B2265; margin:0 0 15px; font-size:14px; text-transform:uppercase; letter-spacing:0.5px; font-weight:700;">Application Details</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Job Title</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">${jobTitle}</span>
                        </td>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Job ID</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">${jobId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Location</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">${jobLocation}</span>
                        </td>
                        <td style="padding:10px 0;">
                          <span style="color:#8899a8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Applied On</span><br>
                          <span style="color:#0f1f3d; font-size:15px; font-weight:600;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <p style="color:#4a5d75; line-height:1.8; font-size:15px; margin-bottom:10px;">
                    Our recruitment team is currently reviewing your profile and qualifications. If your background matches our requirements, we will contact you for the next steps in our hiring process.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background-color:#f8faff; padding:30px 40px; text-align:center;">
                  <p style="color:#8899a8; font-size:13px; margin:0;">
                    Warm Regards,<br>
                    <strong>Adnate IT Solutions Recruitment Team</strong>
                  </p>
                </div>
              </div>
            `;

            // Step 4: Fetch Candidate & Latest Job Details in Parallel
            Promise.all([
               this.heroService.getCandidateObject(candidateId),
               this.heroService.getJobRequisitionObject(jobId)
            ]).then(([cResp, jResp]) => {
               // Extract Candidate Info
               const cData = this.heroService.xmltojson(cResp, 'candidate');
               let finalEmail = sessionEmail;
               let finalName = 'Candidate';

               if (cData) {
                 const cObj = Array.isArray(cData) ? cData[0] : cData;
                 finalEmail = cObj.email || sessionEmail;
                 finalName = cObj.name || cObj.fullName || finalEmail;
               }

               // Extract Job Info
               const jData = this.heroService.xmltojson(jResp, 'job_requisition');
               let finalJobTitle = 'the position';
               let finalLocation = 'Remote/Specified';

               if (jData) {
                 const jObj = Array.isArray(jData) ? jData[0] : jData;
                 finalJobTitle = jObj.job_title || finalJobTitle;
                 finalLocation = jObj.location || finalLocation;
               }

               const emailSubject = `Job Application Received: ${finalJobTitle}`;

               // Step 5: Send the Email
               this.heroService.setEmailProfile().then(() => {
                 return this.heroService.sendMail(
                   finalEmail,
                   finalName,
                   'muditmwork@gmail.com',
                   'Mudit Mathur',
                   emailSubject,
                   buildEmailBody(finalName, finalJobTitle, finalLocation)
                 );
               }).then(() => {
                 console.log('Application confirmation email sent successfully for:', jobId);
               }).catch(err => {
                 console.error('Failed to send application email notification:', err);
               });
            }).catch(err => {
               console.warn('Metadata fetch for email failed, skipping notification', err);
            });
          })
          .catch(err => {
            console.error('Error applying for job:', err);
            const response = {
              status: "error",
              message: "Something went wrong. Please try again later."
            };
            console.log(JSON.stringify(response, null, 2));
            this.toast.error(response.message);
          });
      })
      .catch(err => {
        console.error('Error checking duplicate application:', err);
        const response = {
          status: "error",
          message: "Something went wrong. Please try again later."
        };
        console.log(JSON.stringify(response, null, 2));
        this.toast.error(response.message);
      });
  }
}

