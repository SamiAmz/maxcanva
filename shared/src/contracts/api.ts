export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
