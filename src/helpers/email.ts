import { MailerService } from '@nestjs-modules/mailer';

type EmailOptions = {
  to: string;
  subject: string;
  template: string; // name without extension, e.g. 'welcome'
  context: Record<string, any>;
};

/**
 * Send email asynchronously without blocking the request
 * This is especially important for serverless environments like Vercel
 * where function execution time is limited
 */
export const sendEmailAsync = (
  mailerService: MailerService,
  options: EmailOptions,
): void => {
  // Use setImmediate to defer email sending to next event loop
  // This allows the HTTP response to be sent immediately
  setImmediate(() => {
    sendEmail(mailerService, options).catch((error) => {
      console.error(`Failed to send email to ${options.to}:`, error);
    });
  });
};

/**
 * Send email and await completion before continuing
 * Use this when you want to block the HTTP response until the email is sent.
 */
export const sendEmail = async (
  mailerService: MailerService,
  options: EmailOptions,
): Promise<void> => {
  // Default: SMTP via Nest Mailer (Nodemailer)
  await mailerService.sendMail(options);
};
