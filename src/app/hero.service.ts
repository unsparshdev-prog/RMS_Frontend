import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
declare const $: any;

@Injectable({
  providedIn: 'root'
})
export class HeroService {

  constructor(private router: Router) { }

  /**
   * Logout from Cordys SSO and clear session.
   */
  logoutSSO(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof $ !== 'undefined' && $.cordys?.authentication?.sso) {
        $.cordys.authentication.sso.logout()
          .done(() => {
            sessionStorage.clear();
            localStorage.clear();
            resolve();
          })
          .fail(() => reject(new Error('Logout failed.')));
      } else {
        sessionStorage.clear();
        localStorage.clear();
        resolve();
      }
    });
  }

  /**
   * Helper to logout and immediately redirect to login page.
   */
  async logoutAndRedirect(redirectPath: string = '/login'): Promise<void> {
    try {
      await this.logoutSSO();
    } catch (e) {
      console.error('Logout error, forcing redirect:', e);
    } finally {
      this.router.navigate([redirectPath]);
    }
  }

  /**
   * Generically authenticate against Cordys SSO.
   */
  authenticateSSO(username: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof $ !== 'undefined' && $.cordys?.authentication?.sso) {
        $.cordys.authentication.sso.authenticate(username, password)
          .done(() => resolve())
          .fail(() => reject(new Error('Platform authentication failed.')));
      } else {
        reject(new Error('SSO configuration not available.'));
      }
    });
  }

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
  ajax(method: string, namespace: string, parameters: any, dataType: string = '* json'): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      $.cordys.ajax({
        method,
        namespace,
        dataType,
        parameters,
        success: (response: any) => {
          try { console.log(`HeroService.ajax SUCCESS: method=${method} namespace=${namespace}`, response); } catch (e) {}
          resolve(response);
        },
        error: (e1: any, e2: any, e3: any) => {
          try {
            console.error(`HeroService.ajax ERROR: method=${method} namespace=${namespace}`, e1, e2, e3);
            if (e1 && e1.responseText) {
              console.error('SOAP Fault Response:', e1.responseText);
            }
          } catch (e) {}
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
          emailAddress: ccEmail || ''
        }
      },
      subject: subject || '',
      body: normalizedBody,
      from: {
        displayName: fromDisplayName || 'RMS Notification',
        emailAddress: fromEmail || 'no-reply@rms-system.com',
        replyTo: replyTo || (fromEmail || 'no-reply@rms-system.com')
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
            '@qConstraint': '0',
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

  /**
   * Create a record in the candidate_login table.
   */
  createCandidateLogin(name: string, email: string, password_hash: string, candidate_id?: string): Promise<any> {
    const payload: any = {
      '@reply': 'yes',
      '@commandUpdate': 'no',
      '@preserveSpace': 'no',
      '@batchUpdate': 'no',
      tuple: {
        new: {
          candidate_login: {
            '@qAccess': '0',
            '@qConstraint': '0',
            '@qInit': '0',
            '@qValues': '',
            ...( (candidate_id !== undefined && candidate_id !== null) ? { candidate_id: candidate_id } : {} ),
            name: name,
            email: email,
            password_hash: password_hash,
            account_status: 'ACTIVE',
            created_by: email
          }
        }
      }
    };
    return this.ajax('UpdateCandidate_login', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  /**
   * Create a new user in the organization using the CreateUserInOrganization SOAP API.
   */
  createUser(email: string, fullName: string, role: string = 'Candidate_RMS'): Promise<any> {
    const payload = {
      User: {
        UserName: {
          '@isAnonymous': '',
          text: email
        },
        Description: fullName,
        Credentials: {
          '@allowDuplicate': 'true',
          UserIDPassword: {
            UserID: email,
            Password: 'TEST'
          }
        },
        Roles: {
          Role: {
            '@application': '',
            text: role
          }
        }
      }
    };
    return this.ajax('CreateUserInOrganization', 'http://schemas.cordys.com/UserManagement/1.0/Organization', payload);
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

  getInterviewPanels(): Promise<any> {
    return this.ajax('GetInterview_panelObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '5',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromPanel_id: '1',
      toPanel_id: 'zzzzzzzzz'
    });
  }

  createInterviewPanel(data: {
    panel_id?: string;
    interview_id: string;
    interviewer_id: string;
    interviewer_name: string;
    feedback?: string;
    rating?: string;
    task_id?: string;
    temp1?: string;
    temp2?: string;
    temp3?: string;
    temp4?: string;
    temp5?: string;
    created_at?: string;
    created_by?: string;
  }): Promise<any> {
    const payload = {
      tuple: {
        new: {
          interview_panel: {
            '@qAccess': '0',
            '@qConstraint': '0',
            '@qInit': '0',
            '@qValues': '',
            ...(data.panel_id ? { panel_id: data.panel_id } : {}),
            interview_id: data.interview_id || '',
            interviewer_id: data.interviewer_id || '',
            interviewer_name: data.interviewer_name || '',
            ...(data.feedback ? { feedback: data.feedback } : {}),
            ...(data.rating ? { rating: data.rating } : {}),
            ...(data.task_id ? { task_id: data.task_id } : {}),
            ...(data.temp1 ? { temp1: data.temp1 } : {}),
            ...(data.temp2 ? { temp2: data.temp2 } : {}),
            ...(data.temp3 ? { temp3: data.temp3 } : {}),
            ...(data.temp4 ? { temp4: data.temp4 } : {}),
            ...(data.temp5 ? { temp5: data.temp5 } : {}),
            created_at: data.created_at || '',
            created_by: data.created_by || ''
          }
        }
      }
    };
    return this.ajax('UpdateInterview_panel', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  updateInterviewPanel(oldData: any, newData: any): Promise<any> {
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          interview_panel: {
            '@qConstraint': '0',
            panel_id: ext(oldData.panel_id),
            interview_id: ext(oldData.interview_id),
            interviewer_id: ext(oldData.interviewer_id)
          }
        },
        new: {
          interview_panel: {
            '@qAccess': '0',
            '@qConstraint': '0',
            '@qInit': '0',
            '@qValues': '',
            panel_id: ext(newData.panel_id),
            interview_id: ext(newData.interview_id),
            interviewer_id: ext(newData.interviewer_id),
            interviewer_name: ext(newData.interviewer_name),
            feedback: ext(newData.feedback),
            rating: ext(newData.rating),
            ...(ext(newData.task_id) ? { task_id: ext(newData.task_id) } : {}),
            ...(ext(newData.temp1) ? { temp1: ext(newData.temp1) } : {}),
            ...(ext(newData.temp2) ? { temp2: ext(newData.temp2) } : {}),
            ...(ext(newData.temp3) ? { temp3: ext(newData.temp3) } : {}),
            ...(ext(newData.temp4) ? { temp4: ext(newData.temp4) } : {}),
            ...(ext(newData.temp5) ? { temp5: ext(newData.temp5) } : {}),
            modified_at: new Date().toISOString(),
            modified_by: sessionStorage.getItem('displayName') || 'HR'
          }
        }
      }
    };
    return this.ajax('UpdateInterview_panel', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  deleteInterviewPanel(oldData: any): Promise<any> {
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          interview_panel: {
            '@qConstraint': '0',
            panel_id: ext(oldData.panel_id),
            interview_id: ext(oldData.interview_id),
            interviewer_id: ext(oldData.interviewer_id)
          }
        }
      }
    };
    return this.ajax('UpdateInterview_panel', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  // ===================== CANDIDATE PIPELINE SERVICES =====================

  getCandidates(): Promise<any> {
    return this.ajax('GetCandidateObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromCandidate_id: '0',
      toCandidate_id: 'zzzzzzzzzz'
    });
  }

  getCandidateApplications(): Promise<any> {
    return this.ajax('GetCandidate_job_applicationObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromApplication_id: '1',
      toApplication_id: '9999999'
    });
  }

  updateCandidateApplication(oldApp: any, newApp: any): Promise<any> {
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          candidate_job_application: {
            application_id: ext(oldApp.application_id),
            candidate_id: ext(oldApp.candidate_id),
            jr_id: ext(oldApp.jr_id)
          }
        },
        new: {
          candidate_job_application: {
            application_id: ext(oldApp.application_id),
            candidate_id: ext(oldApp.candidate_id),
            jr_id: ext(oldApp.jr_id),
            application_status: newApp.application_status,
            stage: newApp.stage
          }
        }
      }
    };
    return this.ajax('UpdateCandidate_job_application', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  showAllJobRequisition(): Promise<any> {
    return this.ajax('ShowAllJobRequisition', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  createCandidate(name: string, email: string): Promise<any> {
    const payload: any = {
      '@reply': 'yes',
      '@commandUpdate': 'no',
      '@preserveSpace': 'no',
      '@batchUpdate': 'no',
      tuple: {
        new: {
          candidate: {
             '@qAccess': '0',
             '@qConstraint': '0',
             '@qInit': '0',
             '@qValues': '',
             name: name,
             email: email
          }
        }
      }
    };
    return this.ajax('UpdateCandidate', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  updateCandidate(candidateId: string, updatedFields: any): Promise<any> {
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          candidate: {
            '@qConstraint': '0',
            candidate_id: candidateId
          }
        },
        new: {
          candidate: {
            '@qAccess': '0',
            '@qConstraint': '0',
            '@qInit': '0',
            '@qValues': '',
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
   * Get Candidate ID by email and password using the GetCandidateIDByEmailPassword SOAP service.
   */
  getCandidateIDByEmailPassword(email: string, password: string): Promise<any> {
    return this.ajax('GetCandidateIDByEmailPassword', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      email: email,
      password: password,
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  /**
   * Get Candidate data object by candidate ID using the GetCandidateObject SOAP service.
   */
  getCandidateObject(candidateId: string): Promise<any> {
    return this.ajax('GetCandidateObject', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      Candidate_id: candidateId,
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  /**
   * Get all Candidate records.
   */
  getCandidateObjects(): Promise<any> {
    return this.ajax('GetCandidateObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      fromCandidate_id: '0',
      toCandidate_id: 'zzzzzzzzzz'
    });
  }

  /**
   * Get Candidate record by email only.
   */
  getCandidateByEmail(email: string): Promise<any> {
    return this.ajax('GetCandidateByEmail', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      email: email,
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  // ===================== INTERVIEW PANEL SERVICES =====================

  /**
   * Get all job requisitions for dropdown
   */
  getJobRequisitions(): Promise<any> {
    return this.ajax('GetJob_requisitionObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromJr_id: '0',
      toJr_id: 'zzzzzzzzzz'
    });
  }

  /**
   * Get candidates who applied for a specific job
   */
  getCandidatesForJob(jrId: string): Promise<any> {
    return this.ajax('GetCandidate_job_applicationObjectsForjr_id', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      Jr_id: jrId,
      preserveSpace: 'no',
      qAccess: '0',
      qValues: ''
    });
  }

  /**
   * Get all employees (for interviewer dropdown)
   */
  getEmployees(): Promise<any> {
    return this.ajax('GetEmployeeObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromEmployee_id: '0',
      toEmployee_id: 'zzzzzzzzzz'
    });
  }

  /**
   * Create a new interview (for a single candidate)
   */
  createInterview(data: {
    candidate_id: string;
    jr_id: string;
    round: string;
    scheduled_date: string;
    scheduled_time: string;
    meeting_link: string;
    status: string;
    task_id?: string;
    temp1?: string;
    temp2?: string;
    temp3?: string;
    temp4?: string;
    temp5?: string;
  }): Promise<any> {
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        new: {
          interview: {
            candidate_id: data.candidate_id || '',
            jr_id: data.jr_id || '',
            round: data.round || '',
            scheduled_date: data.scheduled_date || '',
            scheduled_time: data.scheduled_time ? (data.scheduled_time.length === 5 ? data.scheduled_time + ':00' : data.scheduled_time) : '',
            meeting_link: data.meeting_link || '',
            status: data.status || 'SCHEDULED',
            ...(data.task_id ? { task_id: data.task_id } : {}),
            ...(data.temp1 ? { temp1: data.temp1 } : {}),
            ...(data.temp2 ? { temp2: data.temp2 } : {}),
            ...(data.temp3 ? { temp3: data.temp3 } : {}),
            ...(data.temp4 ? { temp4: data.temp4 } : {}),
            ...(data.temp5 ? { temp5: data.temp5 } : {}),
            created_at: new Date().toISOString(),
            created_by: sessionStorage.getItem('displayName') || 'HR'
          }
        }
      }
    };
    return this.ajax('UpdateInterview', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  /**
   * Update interview details
   */
  updateInterview(oldData: any, newData: any): Promise<any> {
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          interview: {
            interview_id: ext(oldData.interview_id),
            candidate_id: ext(oldData.candidate_id),
            jr_id: ext(oldData.jr_id)
          }
        },
        new: {
            interview: {
            interview_id: ext(oldData.interview_id),
            candidate_id: ext(newData.candidate_id) || ext(oldData.candidate_id),
            jr_id: ext(newData.jr_id) || ext(oldData.jr_id),
            round: ext(newData.round) || '',
            scheduled_date: ext(newData.scheduled_date) || '',
            scheduled_time: ext(newData.scheduled_time) ? (ext(newData.scheduled_time).length === 5 ? ext(newData.scheduled_time) + ':00' : ext(newData.scheduled_time)) : '',
            meeting_link: ext(newData.meeting_link) || '',
            status: ext(newData.status) || 'SCHEDULED',
            ...(ext(newData.final_score) ? { final_score: ext(newData.final_score) } : {}),
            ...(ext(newData.task_id) ? { task_id: ext(newData.task_id) } : {}),
            ...(ext(newData.temp1) ? { temp1: ext(newData.temp1) } : {}),
            ...(ext(newData.temp2) ? { temp2: ext(newData.temp2) } : {}),
            ...(ext(newData.temp3) ? { temp3: ext(newData.temp3) } : {}),
            ...(ext(newData.temp4) ? { temp4: ext(newData.temp4) } : {}),
            ...(ext(newData.temp5) ? { temp5: ext(newData.temp5) } : {}),
            created_at: ext(oldData.created_at),
            created_by: ext(oldData.created_by),
            modified_at: new Date().toISOString(),
            modified_by: sessionStorage.getItem('displayName') || 'HR'
          }
        }
      }
    };
    return this.ajax('UpdateInterview', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  /**
   * Upload resume document using a raw SOAP envelope via fetch.
   * We bypass $.cordys.ajax parameter serialization because it corrupts
   * large Base64 strings.
   *
   * The gateway URL must match the pattern used by $.cordys.ajax:
   *   /com.eibus.web.soap.Gateway.wcp?<ct_key>=<ct_value>&timeout=180000
   *
   * The _ct CSRF token is REQUIRED — without it the server returns 403 Forbidden.
   */
  uploadDocumentsRMS(fileName: string, fileContentBase64: string): Promise<any> {
    const soapEnvelope = `<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
      <SOAP:Body>
        <UploadDocuments_RMS xmlns="http://schemas.cordys.com/RMS_DB_Metadata">
          <FileName>${fileName}</FileName>
          <FileContent>${fileContentBase64}</FileContent>
        </UploadDocuments_RMS>
      </SOAP:Body>
    </SOAP:Envelope>`;

    // Build the gateway URL the same way $.cordys.ajax does:
    //   1. Base path: /com.eibus.web.soap.Gateway.wcp  (matches proxy.config.json)
    //   2. Append the CSRF _ct cookie token as a query parameter
    let gatewayUrl = '/com.eibus.web.soap.Gateway.wcp';
    try {
      const ctCookie = ($ as any).cordys.getCookieObject('\\w*_ct');
      if (ctCookie && ctCookie.key && ctCookie.value) {
        gatewayUrl += `?${encodeURIComponent(ctCookie.key)}=${encodeURIComponent(ctCookie.value)}&timeout=180000`;
      }
    } catch (e) {
      console.warn('Could not read _ct cookie, proceeding without CSRF token:', e);
    }

    console.log('UploadDocuments_RMS gateway URL:', gatewayUrl);

    return fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      credentials: 'include',       // send SSO cookies
      body: soapEnvelope
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.text();
    })
    .then(xmlText => {
      console.log('UploadDocuments_RMS raw XML response:', xmlText);
      // Parse the response XML to extract the file path
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      return xmlDoc;
    });
  }

  /**
   * Check if a candidate has already applied for a specific job requisition.
   */
  getApplicationByCandidateAndJR(candidateId: string, jrId: string): Promise<any> {
    return this.ajax('GetApplicationByCandidateAndJR', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      candidate_id: candidateId,
      jr_id: jrId
    });
  }

  /**
   * Update or Create a Candidate Job Application.
   * Maps to: <UpdateCandidate_job_application xmlns="http://schemas.cordys.com/RMS_DB_Metadata">
   */
  updateCandidateJobApplication(data: {
    candidate_id: string;
    jr_id: string;
    application_status: string;
    applied_at?: string;
    stage?: string;
  }): Promise<any> {
    const payload: any = {
      '@reply': 'yes',
      '@commandUpdate': 'no',
      '@preserveSpace': 'no',
      '@batchUpdate': 'no',
      tuple: {
        new: {
          candidate_job_application: {
            '@qAccess': '0',
            '@qConstraint': '0',
            '@qInit': '0',
            '@qValues': '',
            candidate_id: data.candidate_id,
            jr_id: data.jr_id,
            application_status: data.application_status || 'Applied',
            applied_at: data.applied_at || new Date().toISOString(),
            stage: data.stage || 'Applied'
          }
        }
      }
    };

    return this.ajax('UpdateCandidate_job_application', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  // ===================== BPM WORKFLOW SERVICES =====================

  /**
   * Initiate EmployeeTaskBPM process for an interviewer.
   * This creates a task in the BPM system that shows up on the employee's dashboard.
   */
  initiateEmployeeTaskBPM(interviewerId: string): Promise<any> {
    return this.ajax('EmployeeTaskBPM', 'http://schemas.cordys.com/default', {
      InterviewerID: interviewerId
    });
  }

  /**
   * Perform a workflow action on a task (COMPLETE, CLAIM, etc.).
   */
  async performTaskAction(taskId: string, action: string, memo: string, data?: any): Promise<void> {
    try {
      const resp: any = await this.ajax(
        'PerformTaskAction',
        'http://schemas.cordys.com/notification/workflow/1.0',
        {
          TaskId: taskId,
          Action: action,
          Memo: memo,
          Data: data || {}
        }
      );
      if (this.isSoapFault(resp) && action !== 'START') {
        console.warn(`Workflow action ${action} returned fault:`, resp);
      }
    } catch (e) {
      if (action === 'START') {
        console.warn('Task START might have failed (ignoring):', e);
      } else {
        throw e;
      }
    }
  }

  /**
   * Check whether a SOAP response contains a fault.
   */
  isSoapFault(resp: any): boolean {
    if (!resp) return false;
    try {
      const faultString = this.xmltojson(resp, 'faultstring');
      return !!faultString;
    } catch {
      return false;
    }
  }

  /**
   * Get all interview records.
   */
  getInterviews(): Promise<any> {
    return this.ajax('GetInterviewObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromInterview_id: '0',
      toInterview_id: 'zzzzzzzzzz'
    });
  }

  // ===================== REFERRAL SERVICES =====================

  getEmployeeReferrals(): Promise<any> {
    return this.ajax('GetEmployee_referralObjects', 'http://schemas.cordys.com/RMS_DB_Metadata', {
      preserveSpace: 'no',
      qAccess: '0',
      qValues: '',
      cursor: {
        '@id': '0',
        '@position': '0',
        '@numRows': '',
        '@maxRows': '99999',
        '@sameConnection': 'false'
      },
      fromReferral_id: 'REF001',
      toReferral_id: 'REF99999999'
    });
  }

  createEmployeeReferral(data: {
    employee_id: string;
    candidate_id: string;
    jr_id: string;
    referral_status: string;
    task_id?: string;
    temp1?: string;
    temp2?: string;
    temp3?: string;
    temp4?: string;
    temp5?: string;
  }): Promise<any> {
    const payload = {
      tuple: {
        new: {
          employee_referral: {
            employee_id: data.employee_id || '',
            candidate_id: data.candidate_id || '',
            jr_id: data.jr_id || '',
            referral_status: data.referral_status || 'REFERRED',
            task_id: data.task_id || '',
            temp1: data.temp1 || '',
            temp2: data.temp2 || '',
            temp3: data.temp3 || '',
            temp4: data.temp4 || '',
            temp5: data.temp5 || '',
            created_at: new Date().toISOString(),
            created_by: sessionStorage.getItem('displayName') || 'HR',
            modified_at: '',
            modified_by: ''
          }
        }
      }
    };
    return this.ajax('UpdateEmployee_referral', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

  updateEmployeeReferral(oldData: any, newData: any): Promise<any> {
    const ext = (field: any) => field?.text || field?.['#text'] || field || '';
    const payload = {
      reply: 'yes',
      commandUpdate: 'no',
      preserveSpace: 'no',
      batchUpdate: 'no',
      tuple: {
        old: {
          employee_referral: {
            referral_id: ext(oldData.referral_id),
            employee_id: ext(oldData.employee_id),
            candidate_id: ext(oldData.candidate_id)
          }
        },
        new: {
          employee_referral: {
            referral_id: ext(oldData.referral_id),
            employee_id: ext(newData.employee_id) || ext(oldData.employee_id),
            candidate_id: ext(newData.candidate_id) || ext(oldData.candidate_id),
            jr_id: ext(newData.jr_id) || ext(oldData.jr_id),
            referral_status: ext(newData.referral_status) || 'REFERRED',
            task_id: ext(newData.task_id) || '',
            temp1: ext(newData.temp1) || '',
            temp2: ext(newData.temp2) || '',
            temp3: ext(newData.temp3) || '',
            temp4: ext(newData.temp4) || '',
            temp5: ext(newData.temp5) || '',
            created_at: ext(oldData.created_at),
            created_by: ext(oldData.created_by),
            modified_at: new Date().toISOString(),
            modified_by: sessionStorage.getItem('displayName') || 'HR'
          }
        }
      }
    };
    return this.ajax('UpdateEmployee_referral', 'http://schemas.cordys.com/RMS_DB_Metadata', payload);
  }

}
