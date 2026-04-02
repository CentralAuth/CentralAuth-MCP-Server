import type { CentralAuthErrorResponse, OpenIdConfiguration, Organization, ServerConfig } from "./types.js";

export class CentralAuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CentralAuthApiError";
  }
}

export class CentralAuthClient {
  constructor(private readonly config: ServerConfig) { }

  async getOpenIdConfiguration(authBaseUrl = this.config.authBaseUrl): Promise<OpenIdConfiguration> {
    const base = withTrailingSlash(authBaseUrl);
    const url = new URL(".well-known/openid-configuration", base);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await parseErrorBody(response);
      throw new CentralAuthApiError(
        errorBody.message ?? `Failed to fetch OpenID configuration with status ${response.status}`,
        response.status,
        errorBody.errorCode,
        errorBody,
      );
    }

    return (await response.json()) as OpenIdConfiguration;
  }

  async createOrganization(input: {
    tenantId: string;
    name: string;
    customDomain?: string;
    overrideParentSettings?: boolean;
    settings?: {
      allowLocalhost?: boolean;
      enableUserCreation?: boolean;
    };
  }): Promise<Organization> {
    return this.requestJson<Organization>("v2/organization", {
      method: "POST",
      body: input,
    });
  }

  async rotateOrganizationSecret(organizationId: string): Promise<string> {
    return this.requestText(`v1/organization/${organizationId}/rotate_secret`);
  }

  async activateOrganizationSecret(organizationId: string, newSecret: string): Promise<void> {
    await this.requestText(`v1/organization/${organizationId}/activate_secret`, {
      method: "POST",
      body: newSecret,
    });
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(path, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
    });

    return (await response.json()) as T;
  }

  private async requestText(path: string, options: RequestOptions = {}): Promise<string> {
    const response = await this.request(path, options);
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return typeof payload === "string" ? payload : JSON.stringify(payload);
    }

    return await response.text();
  }

  private async request(path: string, options: RequestOptions = {}): Promise<Response> {
    if (!this.config.apiKey) {
      throw new CentralAuthApiError(
        "This admin tool requires `CENTRALAUTH_API_KEY` in the MCP server environment. Docs-only integration tools remain available without it.",
        401,
        "tokenMissing",
      );
    }

    const base = withTrailingSlash(this.config.apiBaseUrl);
    const url = new URL(path, base);
    const headers = new Headers(options.headers ?? {});
    headers.set("Authorization", `Bearer ${this.config.apiKey}`);

    let body: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = typeof options.body === "string" ? JSON.stringify(options.body) : JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    if (!response.ok) {
      const errorBody = await parseErrorBody(response);
      throw new CentralAuthApiError(
        errorBody.message ?? `CentralAuth request failed with status ${response.status}`,
        response.status,
        errorBody.errorCode,
        errorBody,
      );
    }

    return response;
  }
}

async function parseErrorBody(response: Response): Promise<CentralAuthErrorResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as CentralAuthErrorResponse;
  }

  return {
    message: await response.text(),
  };
}

function withTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}
