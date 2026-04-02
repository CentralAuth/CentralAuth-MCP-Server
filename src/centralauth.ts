import type { CentralAuthErrorResponse, OpenIdConfiguration, ServerConfig } from "./types.js";

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
