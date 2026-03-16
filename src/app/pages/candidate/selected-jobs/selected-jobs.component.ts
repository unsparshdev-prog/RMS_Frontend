import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selected-jobs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-jobs.component.html',
  styleUrls: ['./selected-jobs.component.css']
})
export class SelectedJobsComponent {
  selectedJobs = [
    {
      title: 'Senior Frontend Developer', company: 'TechCorp Solutions', location: 'Bangalore, India',
      selectedDate: 'Mar 15, 2026', salary: '₹22 LPA', joiningDate: 'Apr 01, 2026',
      status: 'Offer Accepted', statusColor: 'bg-green-500/10 text-green-600'
    },
    {
      title: 'Backend Engineer', company: 'ScaleUp Inc', location: 'Remote',
      selectedDate: 'Mar 12, 2026', salary: '₹20 LPA', joiningDate: 'Pending',
      status: 'Offer Pending', statusColor: 'bg-yellow-500/10 text-yellow-600'
    }
  ];
}
