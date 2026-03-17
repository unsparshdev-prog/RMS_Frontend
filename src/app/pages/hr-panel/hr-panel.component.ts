import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hr-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hr-panel.component.html',
  styleUrls: ['./hr-panel.component.css']
})
export class HrPanelComponent {
  isSidebarCollapsed = false;
  activeTab = 'Dashboard';

  sidebarSections = [
    {
      title: 'Recruitment',
      items: [
        { name: 'Dashboard', icon: 'fas fa-th-large' },
        { name: 'Job Requisition', icon: 'fas fa-briefcase' },
        { name: 'Candidate Pipeline', icon: 'fas fa-users' },
        { name: 'Interview Scheduling', icon: 'far fa-calendar-alt' },
        { name: 'Offer Tracker', icon: 'fas fa-file-signature' }
      ]
    },
    {
      title: 'Screening & Evaluation',
      items: [
        { name: 'AI Screening', icon: 'fas fa-robot' },
        { name: 'Candidate Comparison', icon: 'fas fa-balance-scale' },
        { name: 'Evaluation Scorecards', icon: 'fas fa-clipboard-list' }
      ]
    },
    {
      title: 'Insights & Network',
      items: [
        { name: 'Referral Tracking', icon: 'fas fa-project-diagram' },
        { name: 'Analytics & Reports', icon: 'fas fa-chart-line' }
      ]
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Approval Chain', icon: 'fas fa-sitemap' }
      ]
    }
  ];

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}

