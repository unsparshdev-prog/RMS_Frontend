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
}
