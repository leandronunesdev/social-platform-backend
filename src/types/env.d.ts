export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      PORT?: string;
      DATABASE_URL?: string;
      JWT_SECRET?: string;
      CORS_ORIGIN?: string;
      SES_SMTP_HOST?: string;
      SES_SMTP_PORT?: string;
      SES_SMTP_USER?: string;
      SES_SMTP_PASS?: string;
      EMAIL_FROM?: string;
      SES_IAM_USER?: string;
      API_BASE_URL?: string;
      JWT_EXPIRES_IN?: string;
      /** Set to "true" to include `debug` on 500 responses and more verbose logs. Turn off after debugging. */
      DEBUG_API_ERRORS?: string;
    }
  }
}
