import { MailerService } from '@nestjs-modules/mailer';

/**
 * Send email asynchronously without blocking the request
 * This is especially important for serverless environments like Vercel
 * where function execution time is limited
 */
export const sendEmailAsync = (
  mailerService: MailerService,
  options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  },
): void => {
  // Use setImmediate to defer email sending to next event loop
  // This allows the HTTP response to be sent immediately
  setImmediate(() => {
    mailerService
      .sendMail(options)
      .then(() => {
        console.log(`Email sent successfully to ${options.to}`);
      })
      .catch((error) => {
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
  options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  },
): Promise<void> => {
  await mailerService.sendMail(options);
};
