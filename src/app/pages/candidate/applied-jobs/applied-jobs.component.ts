import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class AppliedJobsComponent {
  appliedJobs: AppliedJob[] = [
    {
      title: 'Senior Frontend Developer', company: 'TechCorp Solutions', location: 'Bangalore, India',
      appliedDate: 'Mar 14, 2026', status: 'Under Review',
      statusColor: 'bg-yellow-500/10 text-yellow-600',
      expanded: false,
      pipeline: [
        { label: 'Applied', completed: true, current: false },
        { label: 'Screening', completed: true, current: false },
        { label: 'Under Review', completed: false, current: true },
        { label: 'Interview', completed: false, current: false },
        { label: 'Offer', completed: false, current: false }
      ]
    },
    {
      title: 'Backend Engineer', company: 'ScaleUp Inc', location: 'Remote',
      appliedDate: 'Mar 10, 2026', status: 'Interview Scheduled',
      statusColor: 'bg-blue-500/10 text-blue-600',
      expanded: false,
      pipeline: [
        { label: 'Applied', completed: true, current: false },
        { label: 'Screening', completed: true, current: false },
        { label: 'Under Review', completed: true, current: false },
        { label: 'Interview', completed: false, current: true },
        { label: 'Offer', completed: false, current: false }
      ]
    },
    {
      title: 'DevOps Engineer', company: 'CloudFirst Ltd', location: 'Hyderabad, India',
      appliedDate: 'Mar 08, 2026', status: 'Applied',
      statusColor: 'bg-primary/10 text-primary',
      expanded: false,
      pipeline: [
        { label: 'Applied', completed: false, current: true },
        { label: 'Screening', completed: false, current: false },
        { label: 'Under Review', completed: false, current: false },
        { label: 'Interview', completed: false, current: false },
        { label: 'Offer', completed: false, current: false }
      ]
    },
    {
      title: 'UI/UX Designer', company: 'InnovateCo', location: 'Mumbai, India',
      appliedDate: 'Mar 05, 2026', status: 'Rejected',
      statusColor: 'bg-destructive/10 text-destructive',
      expanded: false,
      pipeline: [
        { label: 'Applied', completed: true, current: false },
        { label: 'Screening', completed: true, current: false },
        { label: 'Under Review', completed: true, current: false },
        { label: 'Interview', completed: true, current: false },
        { label: 'Rejected', completed: false, current: true }
      ]
    },
    {
      title: 'Product Manager', company: 'TechCorp Solutions', location: 'Delhi, India',
      appliedDate: 'Mar 01, 2026', status: 'Under Review',
      statusColor: 'bg-yellow-500/10 text-yellow-600',
      expanded: false,
      pipeline: [
        { label: 'Applied', completed: true, current: false },
        { label: 'Screening', completed: false, current: true },
        { label: 'Under Review', completed: false, current: false },
        { label: 'Interview', completed: false, current: false },
        { label: 'Offer', completed: false, current: false }
      ]
    }
  ];

  toggleExpand(index: number): void {
    this.appliedJobs[index].expanded = !this.appliedJobs[index].expanded;
  }

  countByStatus(status: string): number {
    return this.appliedJobs.filter(j => j.status === status).length;
  }
}
