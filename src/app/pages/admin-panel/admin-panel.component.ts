import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeroService } from '../../hero.service';
import { AuthService } from '../../auth.service';
import { LeadershipDashboardService } from '../leadership-dashboard/leadership-dashboard.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  isSidebarCollapsed = false;
  activeTab = 'Dashboard';

  // Toast
  showToastMsg = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Loading for create actions
  isCreating = false;

  // Loading state for employees
  isLoadingEmployees = false;

  // Regex patterns for validation
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private phoneRegex = /^[+]?[\d\s\-()]{10,15}$/;

  private validateEmailAndPhone(email: string, phone: string): string | null {
    if (email && !this.emailRegex.test(email)) {
      return 'Please enter a valid email address (e.g. user@domain.com).';
    }
    if (phone && !this.phoneRegex.test(phone)) {
      return 'Please enter a valid phone number (10-15 digits, e.g. +91 98765 43210).';
    }
    return null;
  }

  constructor(
    private heroService: HeroService,
    private auth: AuthService,
    private router: Router,
    private dashboardService: LeadershipDashboardService
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  async loadEmployees(): Promise<void> {
    this.isLoadingEmployees = true;
    try {
      const employeesResp = await this.dashboardService.getEmployees();
      this.employees = (employeesResp || []).map((e: any) => {
        const name = e.employee_name || '';
        const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        return {
          id: e.employee_id || '',
          name: name,
          department: e.department || '',
          role: e.role || e.designation || '',
          avatar: initials || '??',
          status: e.status || 'Active',
          joinDate: e.joining_date || '',
          email: e.email || ''
        };
      });

      // Update dashboard stats from real data
      this.dashboardStats.totalEmployees = this.employees.length;
      this.dashboardStats.activeHRs = this.employees.filter(e => e.role?.toLowerCase().includes('hr')).length;
      this.dashboardStats.leadershipRoles = this.employees.filter(e => e.role?.toLowerCase().includes('lead') || e.role?.toLowerCase().includes('director') || e.role?.toLowerCase().includes('manager') || e.role?.toLowerCase().includes('vp') || e.role?.toLowerCase().includes('head')).length;

      // Count unique departments
      const depts = new Set(this.employees.map(e => e.department).filter(d => d));
      this.dashboardStats.departments = depts.size;

      // Build department distribution from real data
      const deptCount: Record<string, number> = {};
      this.employees.forEach(e => {
        const dept = e.department || 'Unknown';
        deptCount[dept] = (deptCount[dept] || 0) + 1;
      });
      const colors = ['#0B2265', '#8B5CF6', '#0088A8', '#F59E0B', '#EF4444', '#10B981', '#00C4F0', '#EC4899'];
      this.departmentDistribution = Object.entries(deptCount).map(([name, count], i) => ({
        name,
        count,
        color: colors[i % colors.length],
        percentage: this.employees.length > 0 ? Math.round((count / this.employees.length) * 1000) / 10 : 0
      }));

      console.log('[AdminPanel] Loaded', this.employees.length, 'employees from API');
    } catch (error) {
      console.error('[AdminPanel] Failed to load employees:', error);
    } finally {
      this.isLoadingEmployees = false;
    }
  }

  logout(): void {
    this.auth.logout();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  sidebarSections = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', icon: 'fas fa-th-large' },
        { name: 'All Employees', icon: 'fas fa-users' }
      ]
    },
    {
      title: 'User Management',
      items: [
        { name: 'Create HR', icon: 'fas fa-user-shield' },
        { name: 'Create Leadership', icon: 'fas fa-crown' }
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Departments', icon: 'fas fa-sitemap' },
        { name: 'Settings', icon: 'fas fa-cog' }
      ]
    }
  ];

  // --- Dashboard Stats ---
  dashboardStats = {
    totalEmployees: 142,
    activeHRs: 6,
    leadershipRoles: 4,
    departments: 8,
    newHiresThisMonth: 12,
    attritionRate: 3.2
  };

  departmentDistribution = [
    { name: 'Engineering', count: 52, color: '#0B2265', percentage: 36.6 },
    { name: 'Design', count: 18, color: '#8B5CF6', percentage: 12.7 },
    { name: 'Product', count: 14, color: '#0088A8', percentage: 9.9 },
    { name: 'HR & Ops', count: 22, color: '#F59E0B', percentage: 15.5 },
    { name: 'Marketing', count: 16, color: '#EF4444', percentage: 11.3 },
    { name: 'Sales', count: 12, color: '#10B981', percentage: 8.5 },
    { name: 'Finance', count: 5, color: '#00C4F0', percentage: 3.5 },
    { name: 'Legal', count: 3, color: '#EC4899', percentage: 2.1 }
  ];

  monthlyHiringData = [
    { month: 'Oct', hires: 8 },
    { month: 'Nov', hires: 12 },
    { month: 'Dec', hires: 5 },
    { month: 'Jan', hires: 15 },
    { month: 'Feb', hires: 10 },
    { month: 'Mar', hires: 12 }
  ];

  recentActivity = [
    { action: 'New HR account created', user: 'Sneha Patel', time: '2 hours ago', icon: 'fas fa-user-shield', color: '#0B2265' },
    { action: 'Leadership role assigned', user: 'Vikram Joshi', time: '5 hours ago', icon: 'fas fa-crown', color: '#F59E0B' },
    { action: 'Employee onboarded', user: 'Rohit Mehta', time: '1 day ago', icon: 'fas fa-user-plus', color: '#10B981' },
    { action: 'Department restructured', user: 'Admin', time: '2 days ago', icon: 'fas fa-sitemap', color: '#8B5CF6' },
    { action: 'New HR account created', user: 'Priya Nair', time: '3 days ago', icon: 'fas fa-user-shield', color: '#0B2265' }
  ];

  // --- Employees ---
  employeeSearchQuery = '';
  employees: { id: string; name: string; department: string; role: string; avatar: string; status: string; joinDate: string; email: string }[] = [];

  get filteredEmployees() {
    if (!this.employeeSearchQuery.trim()) return this.employees;
    const q = this.employeeSearchQuery.toLowerCase();
    return this.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    );
  }

  // --- Add Employee ---
  showAddEmployeeModal = false;
  newEmployee = {
    employee_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    role: '',
    joining_date: ''
  };

  openAddEmployeeModal() {
    this.showAddEmployeeModal = true;
    this.newEmployee = {
      employee_name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      role: '',
      joining_date: ''
    };
  }

  closeAddEmployeeModal() {
    this.showAddEmployeeModal = false;
  }

  async createEmployee(): Promise<void> {
    if (!this.newEmployee.employee_name || !this.newEmployee.email || !this.newEmployee.department) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    const validationError = this.validateEmailAndPhone(this.newEmployee.email, this.newEmployee.phone);
    if (validationError) {
      this.showToast(validationError, 'error');
      return;
    }

    this.isCreating = true;
    try {
      // Step 1: Create employee record in DB via UpdateEmployee
      const resp = await this.dashboardService.createEmployee(this.newEmployee);
      console.log('[AdminPanel] Employee created in DB:', resp);

      // Step 2: Create user in Cordys organization for login access
      try {
        const userResp = await this.heroService.createUserInOrganization({
          userName: this.newEmployee.email,
          description: this.newEmployee.employee_name,
          userId: this.newEmployee.email,
          password: 'a1b2c3',
          role: 'Employee_RMS'
        });
        console.log('[AdminPanel] User created in organization:', userResp);
      } catch (orgError) {
        console.error('[AdminPanel] Failed to create user in organization:', orgError);
        // Employee DB record was created, but org user creation failed
        this.showToast('Employee added but login account creation failed. Please create login manually.', 'error');
        await this.loadEmployees();
        return;
      }

      this.closeAddEmployeeModal();
      this.showToast('Employee added and login account created successfully!', 'success');
      // Refresh employees from API
      await this.loadEmployees();
    } catch (error) {
      console.error('[AdminPanel] Failed to create employee:', error);
      this.showToast('Failed to add employee. Please try again.', 'error');
    } finally {
      this.isCreating = false;
    }
  }

  // --- Create HR ---
  showCreateHRModal = false;
  newHR = {
    employee_name: '',
    email: '',
    phone: '',
    department: 'HR & Ops',
    designation: 'HR',
    role: 'HR_RMS',
    joining_date: ''
  };

  openCreateHRModal() {
    this.showCreateHRModal = true;
    this.newHR = {
      employee_name: '',
      email: '',
      phone: '',
      department: 'HR & Ops',
      designation: 'HR',
      role: 'HR_RMS',
      joining_date: ''
    };
  }

  closeCreateHRModal() {
    this.showCreateHRModal = false;
  }

  async createHR(): Promise<void> {
    if (!this.newHR.employee_name || !this.newHR.email) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    const validationError = this.validateEmailAndPhone(this.newHR.email, this.newHR.phone);
    if (validationError) {
      this.showToast(validationError, 'error');
      return;
    }

    this.isCreating = true;
    try {
      // Step 1: Create employee record in DB via UpdateEmployee
      await this.dashboardService.createEmployee({
        employee_name: this.newHR.employee_name,
        email: this.newHR.email,
        phone: this.newHR.phone,
        department: this.newHR.department,
        designation: this.newHR.designation,
        role: this.newHR.role || 'HR',
        joining_date: this.newHR.joining_date
      });
      console.log('[AdminPanel] HR employee created in DB');

      // Step 2: Create Cordys user with HR_RMS role
      try {
        await this.heroService.createUserInOrganization({
          userName: this.newHR.email,
          description: this.newHR.employee_name,
          userId: this.newHR.email,
          password: 'a1b2c3',
          role: 'HR_RMS'
        });
        console.log('[AdminPanel] HR user created in organization with HR_RMS role');
      } catch (orgError) {
        console.error('[AdminPanel] Failed to create HR user in organization:', orgError);
        this.showToast('HR employee added but login account creation failed. Please create login manually.', 'error');
        await this.loadEmployees();
        return;
      }

      this.recentActivity.unshift({
        action: 'New HR account created',
        user: this.newHR.employee_name,
        time: 'Just now',
        icon: 'fas fa-user-shield',
        color: '#0B2265'
      });
      this.closeCreateHRModal();
      this.showToast('HR account created successfully!', 'success');
      await this.loadEmployees();
    } catch (error) {
      console.error('[AdminPanel] Failed to create HR employee:', error);
      this.showToast('Failed to create HR account. Please try again.', 'error');
    } finally {
      this.isCreating = false;
    }
  }

  // --- Create Leadership ---
  showCreateLeadershipModal = false;
  newLeader = {
    employee_name: '',
    email: '',
    phone: '',
    department: 'Product',
    designation: '',
    role: 'Leadership_RMS',
    joining_date: ''
  };

  openCreateLeadershipModal() {
    this.showCreateLeadershipModal = true;
    this.newLeader = {
      employee_name: '',
      email: '',
      phone: '',
      department: 'Product',
      designation: '',
      role: 'Leadership_RMS',
      joining_date: ''
    };
  }

  closeCreateLeadershipModal() {
    this.showCreateLeadershipModal = false;
  }

  async createLeadership(): Promise<void> {
    if (!this.newLeader.employee_name || !this.newLeader.email || !this.newLeader.designation) {
      this.showToast('Please fill in all required fields.', 'error');
      return;
    }

    const validationError = this.validateEmailAndPhone(this.newLeader.email, this.newLeader.phone);
    if (validationError) {
      this.showToast(validationError, 'error');
      return;
    }

    this.isCreating = true;
    try {
      // Step 1: Create employee record in DB via UpdateEmployee
      await this.dashboardService.createEmployee({
        employee_name: this.newLeader.employee_name,
        email: this.newLeader.email,
        phone: this.newLeader.phone,
        department: this.newLeader.department,
        designation: this.newLeader.designation,
        role: this.newLeader.role || 'Leadership',
        joining_date: this.newLeader.joining_date
      });
      console.log('[AdminPanel] Leadership employee created in DB');

      // Step 2: Create Cordys user with Leadership_RMS role
      try {
        await this.heroService.createUserInOrganization({
          userName: this.newLeader.email,
          description: this.newLeader.employee_name,
          userId: this.newLeader.email,
          password: 'a1b2c3',
          role: 'Leadership_RMS'
        });
        console.log('[AdminPanel] Leadership user created in organization with Leadership_RMS role');
      } catch (orgError) {
        console.error('[AdminPanel] Failed to create Leadership user in organization:', orgError);
        this.showToast('Leadership employee added but login account creation failed. Please create login manually.', 'error');
        await this.loadEmployees();
        return;
      }

      this.recentActivity.unshift({
        action: 'Leadership role assigned',
        user: this.newLeader.employee_name,
        time: 'Just now',
        icon: 'fas fa-crown',
        color: '#F59E0B'
      });
      this.closeCreateLeadershipModal();
      this.showToast('Leadership role created successfully!', 'success');
      await this.loadEmployees();
    } catch (error) {
      console.error('[AdminPanel] Failed to create Leadership employee:', error);
      this.showToast('Failed to create leadership role. Please try again.', 'error');
    } finally {
      this.isCreating = false;
    }
  }

  get maxHires() {
    return Math.max(...this.monthlyHiringData.map(d => d.hires));
  }

  setActiveTab(tabName: string) {
    this.activeTab = tabName;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToastMsg = true;
    setTimeout(() => {
      this.showToastMsg = false;
    }, 4000);
  }
}

