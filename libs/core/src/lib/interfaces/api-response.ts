export interface ApiResponse<T> {
  status: number;
  data?: T;
  error?: string;
  statusText?: string;
  message?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  access_token_expires_in: string;
  refresh_token_expires_in: string;
}
