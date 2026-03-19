import { Injectable } from '@angular/core';
declare const $: any;

@Injectable({
  providedIn: 'root'
})
export class HeroService {

  constructor() { }
  xmltojson(resp:any, key:any){
    try {
      if (!resp) { return null; }

      // Prefer the Cordys helper if available
      if (typeof $ !== 'undefined' && $.cordys && $.cordys.json && typeof $.cordys.json.find === 'function') {
        try {
          const r = $.cordys.json.find(resp, key);
          if (r !== undefined && r !== null) { return r; }
        } catch (e) {
          // fall through to generic search
        }
      }

      // If resp is a string, try to parse JSON
      let obj: any = resp;
      if (typeof resp === 'string') {
        try { obj = JSON.parse(resp); } catch (e) { /* leave as string */ }
      }

      // Generic recursive finder for the key
      const findKey = (o: any, k: any): any => {
        if (!o || typeof o !== 'object') { return null; }
        if (k in o) { return o[k]; }
        for (const p of Object.keys(o)) {
          try {
            const res = findKey(o[p], k);
            if (res !== null && res !== undefined) { return res; }
          } catch (e) { /* ignore */ }
        }
        return null;
      };

      return findKey(obj, key);
    } catch (e) {
      return null;
    }
  }
  ajax(method: string, namespace: string, parameters: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      $.cordys.ajax({
        method,
        namespace,
        dataType: '* json',
        parameters,
        success: (response: any) => {
          try { console.log(`HeroService.ajax SUCCESS: method=${method} namespace=${namespace}`, response); } catch (e) {}
          resolve(response);
        },
        error: (e1: any, e2: any, e3: any) => {
          try { console.error(`HeroService.ajax ERROR: method=${method} namespace=${namespace}`, e1, e2, e3); } catch (e) {}
          reject([e1, e2, e3]);
        }
      });
    });
  }

  /**
   * SendMail helper which builds the expected payload and calls the SendMail SOAP service.
   * Parameters are optional where appropriate. Returns a Promise from ajax.
   */
  sendMail(toEmail: string, toDisplayName: string, ccEmail?: string, ccDisplayName?: string, subject?: string, body?: string, fromDisplayName?: string, fromEmail?: string, replyTo?: string): Promise<any> {
    // If caller passed a plain string body, wrap it as HTML for the SendMail SOAP payload.
    // If caller passed an object (e.g. {"@type":"html", text: '...'}), pass it through unchanged.
    const normalizedBody: any = (typeof body === 'string')
      ? { '@type': 'html', text: body }
      : (body || '');

    const payload: any = {
      to: {
        address: {
          emailAddress: toEmail || '',
          displayName: toDisplayName || ''
        }
      },
      cc: {
        address: {
          displayName: ccDisplayName || '',
          emailAddress: ccEmail || 'muditmwork@gmail.com'
        }
      },
      subject: subject || '',
      body: normalizedBody,
      from: {
        displayName: fromDisplayName || 'Library',
        emailAddress: fromEmail || 'noreply@library.example',
        replyTo: replyTo || (fromEmail || 'noreply@library.example')
      }
    };

    return this.ajax('SendMail', 'http://schemas.cordys.com/1.0/email', payload);
  }

  /**
   * Create a Job Requisition by calling the UpdateJob_requisition SOAP service.
   * Maps to: <UpdateJob_requisition xmlns="http://schemas.cordys.com/RMS_DB_Metadata">
   */
  createJobRequisition(data: {
    job_title: string;
    department: string;
    location: string;
    job_description: string;
    required_skills: string;
    min_experience: string;
    max_experience: string;
    salary_range: string;
    no_of_positions: string;
    priority: string;
    status: string;
    approval_status: string;
    closing_date: string;
  }): Promise<any> {
    const payload: any = {
      tuple: {
        new: {
          job_requisition: {
            job_title: data.job_title || '',
            department: data.department || '',
            location: data.location || '',
            job_description: data.job_description || '',
            required_skills: data.required_skills || '',
            min_experience: data.min_experience || '',
            max_experience: data.max_experience || '',
            salary_range: data.salary_range || '',
            no_of_positions: data.no_of_positions || '',
            priority: data.priority || '',
            status: data.status || '',
            approval_status: data.approval_status || '',
            closing_date: data.closing_date || ''
          }
        }
      }
    };

    return this.ajax('UpdateJob_requisition', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  /**
   * Update a Job Requisition
   * Maps to: <UpdateJob_requisition xmlns="http://schemas.cordys.com/RMS_DB_Metadata">
   */
  updateJobRequisition(jr_id: string, data: any): Promise<any> {
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          job_requisition: {
            qConstraint: '0',
            jr_id: jr_id,
            modified_by: sessionStorage.getItem('displayName') || 'HR'
          }
        },
        new: {
          job_requisition: {
            qAccess: '0',
            qConstraint: '0',
            qInit: '0',
            qValues: '',
            job_title: data.job_title || '',
            department: data.department || '',
            location: data.location || '',
            job_description: data.job_description || '',
            required_skills: data.required_skills || '',
            min_experience: data.min_experience || '',
            max_experience: data.max_experience || '',
            salary_range: data.salary_range || '',
            no_of_positions: data.no_of_positions || '',
            priority: data.priority || '',
            status: data.status || '',
            approval_status: data.approval_status || '',
            closing_date: data.closing_date || '',
            modified_at: data.modified_at || '',
            modified_by: sessionStorage.getItem('displayName') || 'HR'
          }
        }
      }
    };
    return this.ajax('UpdateJob_requisition', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  showAllJobRequisition(): Promise<any> {
    return this.ajax('ShowAllJobRequisition', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  updateCandidate(candidateId: string, updatedFields: any): Promise<any> {
    const payload = {
      tuple: {
        old: {
          candidate: {
            candidate_id: candidateId
          }
        },
        new: {
          candidate: {
            ...updatedFields
          }
        }
      }
    };
    return this.ajax('UpdateCandidate', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  getAppliedJobsByCandidate(candidateId: string): Promise<any> {
    return this.ajax('GetAppliedJobsByCandidate', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      candidate_id: candidateId,
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '5',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      }
    });
  }

  /**
   * Create a user in Cordys organization with the given role.
   */
  createUserInOrganization(data: {
    userName: string;
    description: string;
    userId: string;
    password: string;
    role: string;
  }): Promise<any> {
    const payload: any = {
      User: {
        UserName: {
          '@isAnonymous': '',
          text: data.userName
        },
        Description: data.description,
        Credentials: {
          '@allowDuplicate': 'true',
          UserIDPassword: {
            UserID: data.userId,
            Password: data.password
          }
        },
        Roles: {
          Role: {
            '@application': '',
            text: data.role
          }
        }
      }
    };
    return this.ajax('CreateUserInOrganization', 'http://schemas.cordys.com/UserManagement/1.0/Organization', payload);
  }

  /**
   * Get user details including roles from Cordys.
   */
  getUserDetails(userId: string): Promise<any> {
    return this.ajax('GetUserDetails', 'http://schemas.cordys.com/UserManagement/1.0/Organization', {
      UserName: userId
    });
  }

}
