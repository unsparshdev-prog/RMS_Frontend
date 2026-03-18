import { Injectable } from '@angular/core';
import { HeroService } from '../../hero.service';

const NAMESPACE = 'http://schemas.cordys.com/RMS_DB_Metadata';

@Injectable({
  providedIn: 'root'
})
export class LeadershipDashboardService {

  constructor(private hero: HeroService) {}

  // ─── Helper to extract array of entities from Cordys tuple response ───
  private extractTuples(response: any, entityKey: string): any[] {
    // Try finding 'tuple' key in the response
    let tuples = this.hero.xmltojson(response, 'tuple');

    if (!tuples) {
      // Fallback: try to find the entity directly
      const directEntity = this.hero.xmltojson(response, entityKey);
      if (directEntity) {
        console.log(`[DashboardService] Found ${entityKey} directly (no tuple wrapper)`);
        return Array.isArray(directEntity) ? directEntity : [directEntity];
      }
      console.warn(`[DashboardService] No data found for ${entityKey}`);
      return [];
    }

    const arr = Array.isArray(tuples) ? tuples : [tuples];
    const results = arr
      .map((t: any) => {
        try {
          // Standard Cordys: tuple > old > entityKey
          const entity = t?.old?.[entityKey];
          if (entity) return entity;

          // Alternative: tuple directly contains entityKey
          const alt = t?.[entityKey];
          if (alt) return alt;

          // Alternative: tuple itself is the entity (flat structure)
          if (t && typeof t === 'object' && !t.old) {
            return t;
          }

          return null;
        } catch (e) {
          return null;
        }
      })
      .filter((item: any) => item !== null);

    console.log(`[DashboardService] Extracted ${results.length} ${entityKey} records`);
    if (results.length > 0) {
      console.log(`[DashboardService] Sample ${entityKey} fields:`, Object.keys(results[0]));
      console.log(`[DashboardService] First ${entityKey}:`, results[0]);
    }
    return results;
  }

  // ─── Job Requisitions ───
  // Use ShowAllJobRequisition for active jobs
  async getActiveJobRequisitions(): Promise<any[]> {
    const resp = await this.hero.ajax('ShowAllJobRequisition', NAMESPACE, {});
    return this.extractTuples(resp, 'job_requisition');
  }

  // Use GetJob_requisitionObjects with wide range to get ALL jobs (including pending)
  async getAllJobRequisitions(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetJob_requisitionObjects', NAMESPACE, {
        fromJr_id: '0',
        toJr_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'job_requisition');
    } catch (e) {
      console.warn('[DashboardService] GetJob_requisitionObjects failed, trying ShowAll:', e);
      return this.getActiveJobRequisitions();
    }
  }

  async updateJobRequisition(oldData: any, newData: any): Promise<any> {
    return this.hero.ajax('UpdateJob_requisition', NAMESPACE, {
      tuple: {
        old: { job_requisition: oldData },
        new: { job_requisition: newData }
      }
    });
  }

  // ─── Employees ───
  async getEmployees(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetEmployeeObjects', NAMESPACE, {
        fromEmployee_id: '0',
        toEmployee_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'employee');
    } catch (e) {
      console.error('[DashboardService] GetEmployeeObjects failed:', e);
      return [];
    }
  }

  // ─── Candidates ───
  async getCandidates(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetCandidateObjects', NAMESPACE, {
        fromCandidate_id: '0',
        toCandidate_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'candidate');
    } catch (e) {
      console.error('[DashboardService] GetCandidateObjects failed:', e);
      return [];
    }
  }

  async getTotalCandidates(): Promise<number> {
    try {
      const resp = await this.hero.ajax('GetTotalCandidates', NAMESPACE, {});
      const count = this.hero.xmltojson(resp, 'count');
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  async getCandidateApplicationsForJob(jrId: string): Promise<any[]> {
    try {
      console.log('[DashboardService] Fetching applications for jr_id:', jrId);
      const resp = await this.hero.ajax('GetCandidate_job_applicationObjectsForjr_id', NAMESPACE, {
        jr_id: jrId,
        cursor: { '@numRows': 999, '@maxRows': 999 }
      });
      console.log('[DashboardService] Applications response:', JSON.stringify(resp).substring(0, 500));
      const results = this.extractTuples(resp, 'candidate_job_application');
      if (results.length > 0) return results;

      // Fallback: try getting all applications and filter client-side
      console.log('[DashboardService] ForJr_id returned 0, trying GetAll + filter');
      const allResp = await this.hero.ajax('GetCandidate_job_applicationObjects', NAMESPACE, {
        fromApplication_id: '0',
        toApplication_id: '999999',
        cursor: { '@numRows': 999, '@maxRows': 999 }
      });
      console.log('[DashboardService] All applications response:', JSON.stringify(allResp).substring(0, 500));
      const allApps = this.extractTuples(allResp, 'candidate_job_application');
      return allApps.filter((a: any) => a.jr_id === jrId);
    } catch (e) {
      console.error('[DashboardService] getCandidateApplicationsForJob failed:', e);
      return [];
    }
  }

  // ─── Interviews ───
  async getInterviews(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetInterviewObjects', NAMESPACE, {
        fromInterview_id: '0',
        toInterview_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'interview');
    } catch (e) {
      console.error('[DashboardService] GetInterviewObjects failed:', e);
      return [];
    }
  }

  // ─── Offers ───
  async getOffers(): Promise<any[]> {
    try {
      const resp = await this.hero.ajax('GetOfferObjects', NAMESPACE, {
        fromOffer_id: '0',
        toOffer_id: 'zzzzzzzzzz'
      });
      return this.extractTuples(resp, 'offer');
    } catch (e) {
      console.error('[DashboardService] GetOfferObjects failed:', e);
      return [];
    }
  }
}
