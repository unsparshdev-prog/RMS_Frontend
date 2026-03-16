import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-apply-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apply-jobs.component.html',
  styleUrls: ['./apply-jobs.component.css']
})
export class ApplyJobsComponent {
  searchQuery = '';

  jobs = [
    {
      id: 1, title: 'Senior Frontend Developer', company: 'TechCorp Solutions', location: 'Bangalore, India',
      type: 'Full-time', department: 'Engineering', salary: '₹18-25 LPA', posted: '2 days ago',
      description: 'Build modern web applications using Angular, React, and TypeScript with a focus on performance and UX.'
    },
    {
      id: 2, title: 'Backend Engineer', company: 'ScaleUp Inc', location: 'Remote',
      type: 'Full-time', department: 'Engineering', salary: '₹15-22 LPA', posted: '5 days ago',
      description: 'Design and implement scalable APIs and microservices using Node.js and Python.'
    },
    {
      id: 3, title: 'UI/UX Designer', company: 'InnovateCo', location: 'Mumbai, India',
      type: 'Full-time', department: 'Design', salary: '₹12-18 LPA', posted: '1 week ago',
      description: 'Create intuitive and beautiful user experiences for web and mobile applications.'
    },
    {
      id: 4, title: 'DevOps Engineer', company: 'CloudFirst Ltd', location: 'Hyderabad, India',
      type: 'Contract', department: 'Infrastructure', salary: '₹20-28 LPA', posted: '3 days ago',
      description: 'Manage CI/CD pipelines, cloud infrastructure, and container orchestration with Kubernetes.'
    },
    {
      id: 5, title: 'Data Analyst', company: 'DataMinds', location: 'Pune, India',
      type: 'Full-time', department: 'Analytics', salary: '₹10-15 LPA', posted: '1 day ago',
      description: 'Analyze large datasets to derive insights and support business decision-making.'
    },
    {
      id: 6, title: 'Product Manager', company: 'TechCorp Solutions', location: 'Delhi, India',
      type: 'Full-time', department: 'Product', salary: '₹22-30 LPA', posted: '4 days ago',
      description: 'Drive product strategy, roadmap, and execution for enterprise SaaS products.'
    }
  ];

  filteredJobs = [...this.jobs];

  filterJobs(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredJobs = this.jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q)
    );
  }

  applyForJob(jobId: number): void {
    console.log('Applied for job:', jobId);
    // TODO: Integrate with backend
  }
}
