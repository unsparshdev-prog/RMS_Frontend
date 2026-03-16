import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { CareerComponent } from './pages/career/career.component';
import { CandidateComponent } from './pages/candidate/candidate.component';
import { ResumeUploadComponent } from './pages/candidate/resume-upload/resume-upload.component';
import { ApplyJobsComponent } from './pages/candidate/apply-jobs/apply-jobs.component';
import { CandidateDataComponent } from './pages/candidate/candidate-data/candidate-data.component';
import { AppliedJobsComponent } from './pages/candidate/applied-jobs/applied-jobs.component';
import { SelectedJobsComponent } from './pages/candidate/selected-jobs/selected-jobs.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'career', component: CareerComponent },
  {
    path: 'candidate',
    component: CandidateComponent,
    children: [
      { path: '', redirectTo: 'apply-jobs', pathMatch: 'full' },
      { path: 'resume-upload', component: ResumeUploadComponent },
      { path: 'apply-jobs', component: ApplyJobsComponent },
      { path: 'candidate-data', component: CandidateDataComponent },
      { path: 'applied-jobs', component: AppliedJobsComponent },
      { path: 'selected-jobs', component: SelectedJobsComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
