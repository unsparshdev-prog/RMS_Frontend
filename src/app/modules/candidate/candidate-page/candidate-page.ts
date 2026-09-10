import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResumeUpload } from '../resume-upload/resume-upload';
import { ApplyJobs } from '../apply-jobs/apply-jobs';
import { CandidateData } from '../candidate-data/candidate-data';
import { AppliedJobs } from '../applied-jobs/applied-jobs';
import { SelectedJobs } from '../selected-jobs/selected-jobs';

@Component({
  selector: 'app-candidate-page',
  standalone: true,
  imports: [CommonModule, ResumeUpload, ApplyJobs, CandidateData, AppliedJobs, SelectedJobs],
  templateUrl: './candidate-page.html',
  styleUrls: ['./candidate-page.css'],
})
export class CandidatePage {
  activeTab = 'resume';
}
