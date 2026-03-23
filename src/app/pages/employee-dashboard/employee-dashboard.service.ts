import { Injectable } from '@angular/core';
import { HeroService } from '../../hero.service';

const NAMESPACE = 'http://schemas.cordys.com/RMS_DB_Metadata';

@Injectable({
  providedIn: 'root'
})
export class EmployeeDashboardService {

  constructor(private hero: HeroService) {}

  // ─── Helper to extract array of entities from Cordys tuple response ───
  private extractTuples(response: any, entityKey: string): any[] {
    let tuples = this.hero.xmltojson(response, 'tuple');

    if (!tuples) {
      const directEntity = this.hero.xmltojson(response, entityKey);
      if (directEntity) {
        return Array.isArray(directEntity) ? directEntity : [directEntity];
      }
      return [];
    }

    const arr = Array.isArray(tuples) ? tuples : [tuples];
    return arr
      .map((t: any) => {
        try {
          const entity = t?.old?.[entityKey];
          if (entity) return entity;
          const alt = t?.[entityKey];
          if (alt) return alt;
          if (t && typeof t === 'object' && !t.old) return t;
          return null;
        } catch (e) {
          return null;
        }
      })
      .filter((item: any) => item !== null);
  }

  // ─── Interview Panel — get all panel assignments for this interviewer ───
  async getInterviewPanelForInterviewer(employeeId: string): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetInterview_panelObjects', NAMESPACE, {
        fromPanel_id: '0',
        toPanel_id: 'zzzzzzzzzz'
      });
      const allPanels = this.extractTuples(resp, 'interview_panel');
      console.log('[EmployeeService] All panels from DB:', allPanels);
      console.log('[EmployeeService] Looking for interviewer_id:', employeeId);
      const filtered = allPanels.filter((p: any) =>
        (p.interviewer_id || '').toLowerCase() === employeeId.toLowerCase()
      );
      console.log('[EmployeeService] Filtered panels for this employee:', filtered);
      return filtered;
    } catch (e) {
      console.error('[EmployeeService] GetInterview_panelObjects failed:', e);
      return [];
    }
  }

  // ─── Interview details by ID ───
  async getInterviewById(interviewId: string): Promise<any | null> {
    try {
      const resp = await this.hero.ajax('GetInterviewObjects', NAMESPACE, {
        fromInterview_id: '0',
        toInterview_id: 'zzzzzzzzzz'
      });
      const all = this.extractTuples(resp, 'interview');
      return all.find((i: any) => i.interview_id === interviewId) || null;
    } catch (e) {
      console.error('[EmployeeService] GetInterviewObjects failed:', e);
      return null;
    }
  }

  // ─── Get all interviews (for bulk enrichment) ───
  async getAllInterviews(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetInterviewObjects', NAMESPACE, {
        fromInterview_id: '0',
        toInterview_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'interview');
    } catch (e) {
      console.error('[EmployeeService] GetInterviewObjects failed:', e);
      return [];
    }
  }

  // ─── Candidate by ID ───
  async getCandidateById(candidateId: string): Promise<any | null> {
    try {
      const resp = await this.hero.ajax('GetCandidateObjects', NAMESPACE, {
        fromCandidate_id: '0',
        toCandidate_id: 'zzzzzzzzzz'
      });
      const all = this.extractTuples(resp, 'candidate');
      return all.find((c: any) => c.candidate_id === candidateId) || null;
    } catch (e) {
      console.error('[EmployeeService] GetCandidateObjects failed:', e);
      return null;
    }
  }

  // ─── Job Requisition by ID ───
  async getJobRequisitionById(jrId: string): Promise<any | null> {
    try {
      const resp = await this.hero.ajax('GetJob_requisitionObjects', NAMESPACE, {
        fromJr_id: '0',
        toJr_id: 'zzzzzzzzzz'
      });
      const all = this.extractTuples(resp, 'job_requisition');
      return all.find((j: any) => j.jr_id === jrId) || null;
    } catch (e) {
      console.error('[EmployeeService] GetJob_requisitionObjects failed:', e);
      return null;
    }
  }

  // ─── All Candidates (for bulk enrichment) ───
  async getAllCandidates(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetCandidateObjects', NAMESPACE, {
        fromCandidate_id: '0',
        toCandidate_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'candidate');
    } catch (e) {
      console.error('[EmployeeService] GetCandidateObjects failed:', e);
      return [];
    }
  }

  // ─── All Job Requisitions (for bulk enrichment) ───
  async getAllJobRequisitions(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetJob_requisitionObjects', NAMESPACE, {
        fromJr_id: '0',
        toJr_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'job_requisition');
    } catch (e) {
      console.error('[EmployeeService] GetJob_requisitionObjects failed:', e);
      return [];
    }
  }

  // ─── My Referrals ───
  async getMyReferrals(employeeId: string): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetEmployee_referralObjects', NAMESPACE, {
        fromReferral_id: '0',
        toReferral_id: 'zzzzzzzzzz'
      });
      const all = this.extractTuples(resp, 'employee_referral');
      console.log('[EmployeeService] All referrals from DB:', all);
      const filtered = all.filter((r: any) =>
        (r.employee_id || '').toLowerCase() === employeeId.toLowerCase()
      );
      console.log('[EmployeeService] Referrals for employee', employeeId, ':', filtered.length);
      return filtered;
    } catch (e) {
      console.error('[EmployeeService] GetEmployee_referralObjects failed:', e);
      return [];
    }
  }

  // ─── Update Interview Panel (accept / submit feedback) ───
  async updateInterviewPanel(oldData: any, newData: any): Promise<any> {
    return this.hero.ajax('UpdateInterview_panel', NAMESPACE, {
      tuple: {
        old: { interview_panel: oldData },
        new: { interview_panel: newData }
      }
    });
  }

  // ─── Create a new Interview Panel entry (for delegation) ───
  async createInterviewPanelEntry(data: any): Promise<any> {
    return this.hero.ajax('UpdateInterview_panel', NAMESPACE, {
      tuple: {
        new: { interview_panel: data }
      }
    });
  }

  // ─── Create Delegation Record ───
  async createDelegation(data: {
    original_interviewer_id: string;
    delegate_interviewer_id: string;
    start_date: string;
    end_date: string;
    reason: string;
  }): Promise<any> {
    return this.hero.ajax('UpdateInterviewer_delegation', NAMESPACE, {
      tuple: {
        new: {
          interviewer_delegation: {
            original_interviewer_id: data.original_interviewer_id,
            delegate_interviewer_id: data.delegate_interviewer_id,
            start_date: data.start_date,
            end_date: data.end_date,
            reason: data.reason
          }
        }
      }
    });
  }

  // ─── Get All Employees (for delegate picker) ───
  async getEmployees(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetEmployeeObjects', NAMESPACE, {
        fromEmployee_id: '0',
        toEmployee_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'employee');
    } catch (e) {
      console.error('[EmployeeService] GetEmployeeObjects failed:', e);
      return [];
    }
  }
}
