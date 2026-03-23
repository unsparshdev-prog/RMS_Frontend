import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../../hero.service';

@Component({
  selector: 'app-selected-jobs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-jobs.component.html',
  styleUrls: ['./selected-jobs.component.css']
})
export class SelectedJobsComponent implements OnInit {
  selectedJobs: any[] = [];
  loading = true;
  candidateId = '';

  constructor(private heroService: HeroService) {
    this.candidateId = sessionStorage.getItem('candidate_id') || 'CAN002';
  }

  ngOnInit(): void {
    this.loadSelectedJobs();
  }

  async loadSelectedJobs() {
    this.loading = true;
    try {
      const resp = await this.heroService.getAppliedJobsByCandidate(this.candidateId);
      let rawData = this.heroService.xmltojson(resp, 'tuple');
      if (rawData) {
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        this.selectedJobs = [];
        const ext = (field: any) => field?.text || field?.['#text'] || field || '';

        for (const item of dataArray) {
          const j = item.old?.job_requisition || item.job_requisition || item.old || item;
          const finalData = j.job_requisition || j;
          const cjaFallback = item.old?.candidate_job_application || item.candidate_job_application;
          
          const jrId = ext(finalData.jr_id) || ext(finalData.requisition_id) || ext(finalData.id) || (cjaFallback ? ext(cjaFallback.jr_id) : '');
          
          let applicationStatus = 'Applied';
          
          if (cjaFallback) {
             const localStatus = ext(cjaFallback.application_status) || ext(cjaFallback.stage);
             if (localStatus && localStatus !== 'null' && localStatus !== 'undefined') {
                 applicationStatus = localStatus;
             }
          }

          if (jrId && applicationStatus === 'Applied') {
             try {
               const appResp = await this.heroService.getApplicationByCandidateAndJR(this.candidateId, jrId);
               const cjaObj = this.heroService.xmltojson(appResp, 'candidate_job_application');
               if (cjaObj) {
                 const appRecord = Array.isArray(cjaObj) ? cjaObj[0] : cjaObj;
                 const rawStatus = ext(appRecord.application_status) || ext(appRecord.stage);
                 if (rawStatus && rawStatus !== 'null' && rawStatus !== 'undefined') {
                   applicationStatus = rawStatus;
                 }
               }
             } catch (err) {
               console.error('Failed to get status for job', jrId, err);
             }
          }
          
          if (applicationStatus === 'Applied' && !jrId) {
             applicationStatus = ext(finalData.status) || 'Applied';
          }

          const formatStr = (st: string) => {
              if (!st) return 'Applied';
              const s = st.toUpperCase();
              if (s === 'IN_PROGRESS') return 'Interviewing';
              if (s === 'APPLIED') return 'Applied';
              if (s === 'SCREENED') return 'Screened';
              if (s === 'OFFERED') return 'Offered';
              if (s === 'JOINED') return 'Joined';
              if (s === 'SELECTED') return 'Selected';
              return st.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          };
          
          const formattedStatus = formatStr(applicationStatus);
          
          const sLower = formattedStatus.toLowerCase();
          if (sLower.includes('offer') || sLower.includes('join') || sLower.includes('select')) {
             const salaryRange = ext(finalData.salary_range) || 'Not Specified';
             const closingDate = ext(finalData.closing_date);
             const selectedDateStr = ext(finalData.created_at) || (cjaFallback ? ext(cjaFallback.applied_at) : null) || new Date().toISOString();
             
             this.selectedJobs.push({
               title: ext(finalData.job_title) || 'Unknown Job',
               company: 'RMS',
               location: ext(finalData.location) || 'Remote',
               selectedDate: this.formatDate(selectedDateStr),
               salary: salaryRange,
               joiningDate: closingDate ? this.formatDate(closingDate) : 'TBD',
               status: formattedStatus,
               statusColor: this.getStatusColor(formattedStatus)
             });
          }
        }
      }
      this.loading = false;
    } catch (err) {
      console.error('Error loading selected jobs:', err);
      this.loading = false;
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getStatusColor(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('join')) return 'bg-green-500/10 text-green-600';
    if (s.includes('offer')) return 'bg-indigo-500/10 text-indigo-600';
    if (s.includes('select')) return 'bg-green-500/10 text-green-600';
    return 'bg-primary/10 text-primary';
  }
}
