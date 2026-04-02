export type AppType = "generic" | "nextjs" | "express" | "react-native" | "desktop";
export type EnvMode = "basic" | "oauth";

export interface ServerConfig {
  authBaseUrl: string;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  timeoutMs: number;
}

export interface CentralAuthErrorResponse {
  errorCode?: string;
  message?: string;
}

export interface Pager {
  pageIndex?: number;
  pages?: number;
  limitPerPage?: number;
  totalEntities?: number;
}

export interface PagedResponse<T> {
  pager: Pager;
  data: T[] | null;
}

export interface UserConnection {
  id: string;
  type: string;
  userId: string;
  created?: string;
  updated?: string;
}

export interface User {
  id: string;
  email: string;
  gravatar?: string;
  verified?: boolean;
  blocked?: boolean;
  organizationId: string;
  created?: string;
  updated?: string;
  lastLogin?: string | null;
  connections?: UserConnection[];
}

export interface WhitelistItem {
  id?: string;
  value: string;
}

export interface OAuthProvider {
  id?: string;
  type: string;
  useOwnCredentials?: boolean;
  clientId?: string | null;
  clientSecret?: string | null;
}

export interface NativeAppRegistration {
  id?: string;
  type: "mobile" | "desktop";
  bundleId: string;
  appLink: string;
  certificateThumbprint?: string | null;
}

export interface OrganizationSettings {
  maxSessionTime?: number;
  maxInactivityTime?: number;
  enableUserCreation?: boolean;
  allowLocalhost?: boolean;
  checkReferrer?: boolean;
  hijackProtection?: boolean;
  hijackProtectionIp?: boolean;
  hijackProtectionUserAgent?: boolean;
  hijackProtectionDeviceId?: boolean;
  autoLogin?: boolean;
  defaultLoginMethod?: "local" | "remote" | "userPick";
  defaultLoginAttemptType?: "link" | "challenge" | "code";
}

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  logo?: string | null;
  domain?: string | null;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  mailConnectionEnabled?: boolean;
  passkeyConnectionEnabled?: boolean;
  centralAuthAppConnectionEnabled?: boolean;
  overrideParentSettings?: boolean;
  settings?: OrganizationSettings;
  whitelistItems?: WhitelistItem[];
  appRegistrations?: NativeAppRegistration[];
  oAuthProviders?: OAuthProvider[];
  themeSettings?: Record<string, unknown>;
  created?: string;
  updated?: string;
}

export interface APIKey {
  id: string;
  organizationId: string;
  name: string;
  key?: string;
  created?: string;
  updated?: string;
  lastUsed?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorType: "user" | "apiKey" | "authToken" | "system";
  actorId?: string | null;
  action: "CREATE" | "UPDATE" | "UPSERT" | "DELETE";
  targetType: string;
  targetId: string;
  status: "success" | "failure";
  ipAddress: string;
  details?: Record<string, unknown>;
  created: string;
}

export interface ApiRequestLog {
  id: string;
  tenantId: string;
  endpoint: string;
  date: string;
}

export interface MailLog {
  id: string;
  organizationId: string;
  to: string;
  from: string;
  subject: string;
  body?: string;
  sent: boolean;
  responseTime?: number;
  response?: string | null;
  error?: string | null;
  created: string;
}

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  scopes_supported?: string[];
  response_types_supported?: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}
