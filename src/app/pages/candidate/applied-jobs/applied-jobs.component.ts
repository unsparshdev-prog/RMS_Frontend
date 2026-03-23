import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroService } from '../../../hero.service';

interface PipelineStep {
  label: string;
  completed: boolean;
  current: boolean;
}

interface AppliedJob {
  title: string;
  company: string;
  location: string;
  appliedDate: string;
  status: string;
  statusColor: string;
  expanded: boolean;
  pipeline: PipelineStep[];
}

@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './applied-jobs.component.html',
  styleUrls: ['./applied-jobs.component.css']
})
export class AppliedJobsComponent implements OnInit {
  appliedJobs: AppliedJob[] = [];
  loading = true;
  candidateId = '';

  constructor(private heroService: HeroService) {
    this.candidateId = sessionStorage.getItem('candidate_id') || 'CAN002';
  }

  ngOnInit(): void {
    this.loadAppliedJobs();
  }

  async loadAppliedJobs() {
    this.loading = true;
    try {
      const resp = await this.heroService.getAppliedJobsByCandidate(this.candidateId);
      console.log('GetAppliedJobsByCandidate RAW Response:', resp);
      
      let rawData = this.heroService.xmltojson(resp, 'tuple');
      console.log('Extracted Tuples:', rawData);

      if (rawData) {
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        this.appliedJobs = [];
        
        const ext = (field: any) => field?.text || field?.['#text'] || field || '';

        for (const item of dataArray) {
          const j = item.old?.job_requisition || item.job_requisition || item.old || item;
          const finalData = j.job_requisition || j;

          const cjaFallback = item.old?.candidate_job_application || item.candidate_job_application;
          const jrId = ext(finalData.jr_id) || ext(finalData.requisition_id) || ext(finalData.id) || (cjaFallback ? ext(cjaFallback.jr_id) : '');
          
          let applicationStatus = 'Applied';
          
          // FAST PATH: Try to get status directly from the combined tuple first!
          if (cjaFallback) {
             const localStatus = ext(cjaFallback.application_status) || ext(cjaFallback.stage);
             if (localStatus && localStatus !== 'null' && localStatus !== 'undefined') {
                 applicationStatus = localStatus;
             }
          }
          
          // SLOW PATH: If we still don't have a specific status, query the secondary service directly.
          if (jrId && (applicationStatus === 'Applied')) {
             try {
               const appResp = await this.heroService.getApplicationByCandidateAndJR(this.candidateId, jrId);
               console.log(`App Status RAW for ${jrId}:`, appResp);
               
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
          
          // Re-capitalize correctly just for display fallback
          const titleStr = ext(finalData.job_title) || 'Unknown Job';
          const locStr = ext(finalData.location) || 'Remote';
          const dateStr = ext(finalData.created_at) || (cjaFallback ? ext(cjaFallback.applied_at) : null) || new Date().toISOString();

          // Format the DB status to Title Case and map specific DB values to HR Panel names
          const formatStr = (st: string) => {
              if (!st) return 'Applied';
              const s = st.toUpperCase();
              if (s === 'IN_PROGRESS') return 'Interviewing';
              if (s === 'APPLIED') return 'Applied';
              if (s === 'SCREENED') return 'Screened';
              if (s === 'OFFERED') return 'Offered';
              if (s === 'JOINED') return 'Joined';
              return st.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          };
          const formattedStatus = formatStr(applicationStatus);

          this.appliedJobs.push({
             title: titleStr,
             company: 'RMS',
             location: locStr,
             appliedDate: this.formatDate(dateStr),
             status: formattedStatus,
             statusColor: this.getStatusColor(formattedStatus),
             expanded: false,
             pipeline: this.generatePipeline(formattedStatus)
          });
        }
        
        console.log('Mapped Applied Jobs:', this.appliedJobs);
      }
      this.loading = false;
    } catch (err) {
      console.error('Error loading applied jobs:', err);
      this.loading = false;
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  getStatusColor(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('shortlist') || s.includes('review')) return 'bg-yellow-500/10 text-yellow-600';
    if (s.includes('progress') || s.includes('interview')) return 'bg-blue-500/10 text-blue-600';
    if (s.includes('reject')) return 'bg-destructive/10 text-destructive';
    if (s.includes('join')) return 'bg-green-500/10 text-green-600';
    if (s.includes('offer')) return 'bg-indigo-500/10 text-indigo-600';
    if (s.includes('screen')) return 'bg-teal-500/10 text-teal-600';
    return 'bg-primary/10 text-primary';
  }

  generatePipeline(status: string): PipelineStep[] {
    const steps = ['Applied', 'Screened', 'Interviewing', 'Offered', 'Joined'];
    const currentStatus = status || 'Applied';
    
    const s = currentStatus.toLowerCase();
    let currentIndex = 0;
    
    if (s.includes('join')) currentIndex = 4;
    else if (s.includes('offer')) currentIndex = 3;
    else if (s.includes('progress') || s.includes('interview')) currentIndex = 2;
    else if (s.includes('screen')) currentIndex = 1;
    else if (s.includes('applied')) currentIndex = 0;

    // Handle Rejected special case
    if (s.includes('rejected')) {
        return [
            { label: 'Applied', completed: true, current: false },
            { label: 'Rejected', completed: false, current: true }
        ];
    }

    return steps.map((label, index) => ({
      label: label,
      completed: index < currentIndex,
      current: index === currentIndex
    }));
  }

  toggleExpand(index: number): void {
    this.appliedJobs[index].expanded = !this.appliedJobs[index].expanded;
  }

  countByStatus(status: string): number {
    return this.appliedJobs.filter(j => j.status === status).length;
  }
}
