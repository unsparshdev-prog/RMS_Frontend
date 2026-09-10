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

  // Form fields
  expectedSalary: string = '';
  relevantSkills: string = '';
  preferredLocation: string = '';
  currentCtc: string = '';
  experience: string = '';
  noticePeriod: string = '';
  willingToRelocate: boolean = false;
  applicationSource: string = '';
  
  availableLocations: string[] = [];

  // Source options for how the candidate found the job
  applicationSourceOptions: string[] = [
    'LinkedIn',
    'Career Portal',
    'Naukri',
    'Indeed',
    'Glassdoor',
    'Company Website',
    'Campus Recruitment',
    'Job Fair',
    'Social Media',
    'Newspaper/Print Ad',
    'Other'
  ];
  selectedJobDetails: any = null;

  // Referral fields
  hasReferral: boolean = false;
  referralEmployeeId: string = '';

  // Confirmation modal state
  showConfirmModal = false;
  confirmJobId = '';
  confirmJobTitle = '';
  confirmApplicationId = ''; // To store application_id if it exists

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
          }).filter((j: any) => j.id && j.type?.toUpperCase() === 'ACTIVE'); // Only show ACTIVE jobs to candidates

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
    this.selectedJobDetails = job || null;

    // Parse available locations from job details
    this.availableLocations = [];
    if (job && job.location) {
      // Handle comma or slash separated locations, defaulting to providing what's available
      const rawLoc = typeof job.location === 'string' ? job.location : (job.location?.text || job.location?.['#text'] || String(job.location));
      this.availableLocations = rawLoc.split(/[,\/]/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    }
    
    // Reset form fields
    this.expectedSalary = '';
    this.currentCtc = '';
    this.experience = '';
    this.noticePeriod = '';
    this.willingToRelocate = false;
    this.applicationSource = '';
    this.relevantSkills = '';
    this.preferredLocation = '';
    this.hasReferral = false;
    this.referralEmployeeId = '';
    this.confirmApplicationId = '';

    // Check if there's an existing application to get the Application ID
    this.heroService.getApplicationByCandidateAndJR(candidateId, jobId)
      .then(resp => {
        const existingApp = this.heroService.xmltojson(resp, 'candidate_job_application');
        if (existingApp) {
          const appObj = Array.isArray(existingApp) ? existingApp[0] : existingApp;
          this.confirmApplicationId = appObj.application_id;
          this.expectedSalary = appObj.temp1 || '';
          this.relevantSkills = appObj.temp2 || '';
          this.preferredLocation = appObj.temp3 || '';
          
          if (appObj.temp4) {
            try {
              const extraData = JSON.parse(appObj.temp4);
              this.currentCtc = extraData.currentCtc || '';
              this.experience = extraData.experience || '';
              this.noticePeriod = extraData.noticePeriod || '';
              this.willingToRelocate = extraData.willingToRelocate || false;
            } catch (e) {
              console.warn('Could not parse temp4 JSON', e);
            }
          }

          // Read source from temp5
          if (appObj.temp5) {
            this.applicationSource = appObj.temp5;
          }
          
          // If the previously selected location isn't in the job's defined locations, add it to options to avoid breaking the UI
          if (this.preferredLocation && !this.availableLocations.includes(this.preferredLocation)) {
            this.availableLocations.push(this.preferredLocation);
          }
          
          this.toast.info('You have already applied for this job. You can update your details below.');
        }
        this.showConfirmModal = true;
      })
      .catch(err => {
        console.warn('Error checking for existing application', err);
        this.showConfirmModal = true;
      });
  }

  cancelApply(): void {
    this.showConfirmModal = false;
    this.confirmJobId = '';
    this.confirmJobTitle = '';
  }

  confirmApply(): void {
    // Validate form
    if (!this.expectedSalary || !this.currentCtc || !this.experience || !this.noticePeriod || !this.relevantSkills || !this.preferredLocation) {
      this.toast.warning('Please provide all required fields including CTC, experience, and notice period.');
      return;
    }

    // Validate source
    if (!this.applicationSource) {
      this.toast.warning('Please select how you found about this job.');
      return;
    }

    // Validate referral employee ID if referral is checked
    if (this.hasReferral && !this.referralEmployeeId.trim()) {
      this.toast.warning('Please enter the referring employee\'s Employee ID.');
      return;
    }

    this.showConfirmModal = false;
    const candidateId = this.authService.getCandidateId();
    const jobId = this.confirmJobId;
    const applicationId = this.confirmApplicationId;
    
    const salary = this.expectedSalary;
    const skills = this.relevantSkills;
    const location = this.preferredLocation;
    const source = this.applicationSource;
    const isReferral = this.hasReferral;
    const refEmployeeId = this.referralEmployeeId.trim();

    const extraData = {
      currentCtc: this.currentCtc,
      experience: this.experience,
      noticePeriod: this.noticePeriod,
      willingToRelocate: this.willingToRelocate
    };
    
    this.confirmJobId = '';
    this.confirmJobTitle = '';
    this.confirmApplicationId = '';
    this.expectedSalary = '';
    this.currentCtc = '';
    this.experience = '';
    this.noticePeriod = '';
    this.willingToRelocate = false;
    this.applicationSource = '';
    this.relevantSkills = '';
    this.preferredLocation = '';
    this.hasReferral = false;
    this.referralEmployeeId = '';

    // CREATE OR UPDATE APPLICATION
    const applicationData = {
      application_id: applicationId,
      candidate_id: candidateId,
      jr_id: jobId,
      application_status: 'APPLIED',
      applied_at: new Date().toISOString(),
      stage: 'Applied',
      temp1: salary,
      temp2: skills,
      temp3: location,
      temp4: JSON.stringify(extraData),
      temp5: source
    };

    const jobTitleForEmail = this.confirmJobTitle;

    this.heroService.updateCandidateJobApplication(applicationData)
      .then(async () => {
        // SUCCESS RESPONSE
        const response = {
          status: "success",
          message: applicationId ? "Application updated successfully." : "Application submitted successfully."
        };
        console.log(JSON.stringify(response, null, 2));
        this.toast.success(response.message);

        // ===== REFERRAL HANDLING =====
        if (isReferral && refEmployeeId) {
          try {
            // 1. Create employee_referral record
            const referralResp = await this.heroService.createEmployeeReferral({
              employee_id: refEmployeeId,
              candidate_id: candidateId,
              jr_id: jobId,
              referral_status: 'REFERRED'
            });

            // 2. Extract the generated referral_id from response
            const refData = this.heroService.xmltojson(referralResp, 'employee_referral');
            let referralId = '';
            if (refData) {
              const refObj = Array.isArray(refData) ? refData[0] : refData;
              referralId = refObj.referral_id || '';
            }

            // 3. Update candidate record with has_referral = true and referral_id
            await this.heroService.updateCandidate(candidateId, {
              candidate_id: candidateId,
              has_referral: 'true',
              referral_id: referralId,
              source: 'Employee Referral'
            });

            console.log('Referral created successfully. Referral ID:', referralId);
            this.toast.success('Referral recorded successfully!');
          } catch (refErr) {
            console.error('Error creating referral:', refErr);
            this.toast.warning('Application submitted but referral could not be recorded. Please contact HR.');
          }
        }

        // SEND MAIL FOR JOB APPLIED
        const sessionEmail = sessionStorage.getItem('displayName') || '';
        const jobDetails = this.filteredJobs.find(j => j.id === jobId);
        const subject = `Job Application Received: ${jobTitleForEmail}`;

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

        // Parallel Metadata Fetch
        Promise.all([
          this.heroService.getCandidateObject(candidateId),
          this.heroService.getJobRequisitionObject(jobId)
        ]).then(([cResp, jResp]) => {
          const cData = this.heroService.xmltojson(cResp, 'candidate');
          let finalEmail = sessionEmail;
          let finalName = 'Candidate';

          if (cData) {
            const cObj = Array.isArray(cData) ? cData[0] : cData;
            finalEmail = cObj.email || sessionEmail;
            finalName = cObj.name || cObj.fullName || finalEmail;
          }

          const jData = this.heroService.xmltojson(jResp, 'job_requisition');
          let finalJobTitle = jobTitleForEmail;
          let finalLocation = 'Not Specified';

          if (jData) {
            const jObj = Array.isArray(jData) ? jData[0] : jData;
            finalJobTitle = jObj.job_title || finalJobTitle;
            finalLocation = jObj.location || finalLocation;
          }

          this.heroService.setEmailProfile().then(() => {
            return this.heroService.sendMail(
              finalEmail,
              finalName,
              'muditmwork@gmail.com',
              'Mudit Mathur',
              `Job Application Received: ${finalJobTitle}`,
              buildEmailBody(finalName, finalJobTitle, finalLocation)
            );
          }).then(() => {
            console.log('Confirmation email sent');
          }).catch(e => console.error('Email error', e));
        }).catch(e => console.warn('Metadata error', e));
      })
      .catch(err => {
        console.error('Error applying for job:', err);
        this.toast.error("Something went wrong. Please try again later.");
      });
  }
}

