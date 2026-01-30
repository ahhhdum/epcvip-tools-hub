/**
 * Audit Logger for EPCVIP Tools Hub
 *
 * Provides structured JSON audit logging for authentication events.
 * Dual-write: stdout for Railway logs + Supabase for queryable persistence.
 *
 * Usage:
 *   import { AuditLogger } from './audit-logger';
 *
 *   const audit = new AuditLogger('tools-hub');
 *
 *   // Sync logging (stdout only)
 *   audit.logLoginSuccess('user@example.com', '1.2.3.4');
 *
 *   // Async logging (stdout + Supabase persistence)
 *   await audit.logLoginSuccessAsync('user@example.com', '1.2.3.4', 'Mozilla/5.0...');
 *
 * Environment Variables:
 *   SUPABASE_URL: Supabase project URL (required for persistence)
 *   SUPABASE_SERVICE_KEY: Supabase service role key (required for persistence)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Event types matching Python audit logger
export enum AuthEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_VALIDATED = 'token_validated',
  TOKEN_EXPIRED = 'token_expired',
  TOKEN_INVALID = 'token_invalid',
  RBAC_GRANTED = 'rbac_granted',
  RBAC_DENIED = 'rbac_denied',
  DOMAIN_VIOLATION = 'domain_violation',
  ALLOWLIST_VIOLATION = 'allowlist_violation',
  AUTH_BYPASSED = 'auth_bypassed',
}

interface AuditEvent {
  timestamp: string;
  app_id: string;
  event_type: string;
  user_email?: string;
  client_ip?: string;
  success: boolean;
  details?: Record<string, unknown>;
  user_agent?: string;
}

interface SupabaseRow {
  app_id: string;
  user_email?: string;
  event_type: string;
  success: boolean;
  client_ip?: string;
  user_agent?: string;
  metadata: Record<string, unknown>;
}

export class AuditLogger {
  private appId: string;
  private supabase: SupabaseClient | null = null;
  private persistEnabled: boolean = false;

  constructor(appId: string) {
    this.appId = appId;

    // Initialize Supabase client for persistence
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (url && serviceKey) {
      this.supabase = createClient(url, serviceKey);
      this.persistEnabled = true;
    } else if (url) {
      console.warn('[AuditLogger] Supabase persistence disabled (missing service key)');
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private createEvent(
    eventType: AuthEventType,
    email?: string,
    clientIp?: string,
    success: boolean = true,
    details?: Record<string, unknown>,
    userAgent?: string
  ): AuditEvent {
    return {
      timestamp: new Date().toISOString(),
      app_id: this.appId,
      event_type: eventType,
      user_email: email,
      client_ip: clientIp,
      success,
      details: details && Object.keys(details).length > 0 ? details : undefined,
      user_agent: userAgent,
    };
  }

  private toSupabaseRow(event: AuditEvent): SupabaseRow {
    return {
      app_id: event.app_id,
      user_email: event.user_email,
      event_type: event.event_type,
      success: event.success,
      client_ip: event.client_ip,
      // Truncate user_agent to 512 chars (Phase 1B fix)
      user_agent: event.user_agent ? event.user_agent.substring(0, 512) : undefined,
      metadata: event.details || {},
    };
  }

  private log(
    eventType: AuthEventType,
    email?: string,
    clientIp?: string,
    success: boolean = true,
    details?: Record<string, unknown>,
    userAgent?: string
  ): AuditEvent {
    const event = this.createEvent(eventType, email, clientIp, success, details, userAgent);

    // Clean up undefined fields for stdout
    const cleanEvent: Record<string, unknown> = { ...event };
    Object.keys(cleanEvent).forEach((key) => {
      if (cleanEvent[key] === undefined) {
        delete cleanEvent[key];
      }
    });

    // Print JSON to stdout (Railway captures this)
    console.log(JSON.stringify(cleanEvent));

    return event;
  }

  private async persistToSupabase(event: AuditEvent): Promise<boolean> {
    if (!this.persistEnabled || !this.supabase) {
      return false;
    }

    try {
      const { error, status } = await this.supabase
        .from('auth_audit_log')
        .insert(this.toSupabaseRow(event));

      if (error) {
        // Phase 1B fix: Include event context in warning
        console.warn(
          `[AuditLogger] Persist failed: status=${status} ` +
            `event=${event.event_type} user=${event.user_email} error=${error.message}`
        );
        return false;
      }

      return true;
    } catch (e) {
      // Phase 1B fix: Include event context in warning
      console.warn(
        `[AuditLogger] Persist failed: event=${event.event_type} ` +
          `user=${event.user_email} error=${e}`
      );
      return false;
    }
  }

  private async logAsync(
    eventType: AuthEventType,
    email?: string,
    clientIp?: string,
    success: boolean = true,
    details?: Record<string, unknown>,
    userAgent?: string
  ): Promise<AuditEvent> {
    const event = this.log(eventType, email, clientIp, success, details, userAgent);
    await this.persistToSupabase(event);
    return event;
  }

  // -------------------------------------------------------------------------
  // Login Events (Sync - stdout only)
  // -------------------------------------------------------------------------

  logLoginSuccess(email: string, clientIp?: string): void {
    this.log(AuthEventType.LOGIN_SUCCESS, email, clientIp, true);
  }

  logLoginFailure(email?: string, clientIp?: string, reason?: string): void {
    const details = reason ? { reason } : undefined;
    this.log(AuthEventType.LOGIN_FAILURE, email, clientIp, false, details);
  }

  logLogout(email: string, clientIp?: string): void {
    this.log(AuthEventType.LOGOUT, email, clientIp, true);
  }

  // -------------------------------------------------------------------------
  // Login Events (Async - with Supabase persistence)
  // -------------------------------------------------------------------------

  async logLoginSuccessAsync(email: string, clientIp?: string, userAgent?: string): Promise<void> {
    await this.logAsync(AuthEventType.LOGIN_SUCCESS, email, clientIp, true, undefined, userAgent);
  }

  async logLoginFailureAsync(
    email?: string,
    clientIp?: string,
    reason?: string,
    userAgent?: string
  ): Promise<void> {
    const details = reason ? { reason } : undefined;
    await this.logAsync(AuthEventType.LOGIN_FAILURE, email, clientIp, false, details, userAgent);
  }

  async logLogoutAsync(email: string, clientIp?: string, userAgent?: string): Promise<void> {
    await this.logAsync(AuthEventType.LOGOUT, email, clientIp, true, undefined, userAgent);
  }

  // -------------------------------------------------------------------------
  // Token Events
  // -------------------------------------------------------------------------

  logTokenValidated(email: string, clientIp?: string): void {
    this.log(AuthEventType.TOKEN_VALIDATED, email, clientIp, true);
  }

  logTokenExpired(email?: string, clientIp?: string): void {
    this.log(AuthEventType.TOKEN_EXPIRED, email, clientIp, false);
  }

  logTokenInvalid(clientIp?: string, reason?: string): void {
    const details = reason ? { reason } : undefined;
    this.log(AuthEventType.TOKEN_INVALID, undefined, clientIp, false, details);
  }

  async logTokenInvalidAsync(
    clientIp?: string,
    reason?: string,
    userAgent?: string
  ): Promise<void> {
    const details = reason ? { reason } : undefined;
    await this.logAsync(
      AuthEventType.TOKEN_INVALID,
      undefined,
      clientIp,
      false,
      details,
      userAgent
    );
  }

  // -------------------------------------------------------------------------
  // RBAC Events
  // -------------------------------------------------------------------------

  logRbacGranted(email: string, role: string, clientIp?: string): void {
    this.log(AuthEventType.RBAC_GRANTED, email, clientIp, true, { role });
  }

  logRbacDenied(email: string, clientIp?: string, reason?: string): void {
    const details = reason ? { reason } : undefined;
    this.log(AuthEventType.RBAC_DENIED, email, clientIp, false, details);
  }

  async logRbacGrantedAsync(
    email: string,
    role: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAsync(AuthEventType.RBAC_GRANTED, email, clientIp, true, { role }, userAgent);
  }

  async logRbacDeniedAsync(
    email: string,
    clientIp?: string,
    reason?: string,
    userAgent?: string
  ): Promise<void> {
    const details = reason ? { reason } : undefined;
    await this.logAsync(AuthEventType.RBAC_DENIED, email, clientIp, false, details, userAgent);
  }

  // -------------------------------------------------------------------------
  // Policy Violation Events
  // -------------------------------------------------------------------------

  logDomainViolation(email: string, clientIp?: string): void {
    this.log(AuthEventType.DOMAIN_VIOLATION, email, clientIp, false);
  }

  logAllowlistViolation(email: string, clientIp?: string): void {
    this.log(AuthEventType.ALLOWLIST_VIOLATION, email, clientIp, false);
  }

  async logDomainViolationAsync(
    email: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAsync(
      AuthEventType.DOMAIN_VIOLATION,
      email,
      clientIp,
      false,
      undefined,
      userAgent
    );
  }

  async logAllowlistViolationAsync(
    email: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAsync(
      AuthEventType.ALLOWLIST_VIOLATION,
      email,
      clientIp,
      false,
      undefined,
      userAgent
    );
  }

  // -------------------------------------------------------------------------
  // Development Events
  // -------------------------------------------------------------------------

  logAuthBypassed(clientIp?: string, reason: string = 'development'): void {
    this.log(AuthEventType.AUTH_BYPASSED, 'dev@localhost', clientIp, true, { reason });
  }

  async logAuthBypassedAsync(
    clientIp?: string,
    reason: string = 'development',
    userAgent?: string
  ): Promise<void> {
    await this.logAsync(
      AuthEventType.AUTH_BYPASSED,
      'dev@localhost',
      clientIp,
      true,
      { reason },
      userAgent
    );
  }
}
