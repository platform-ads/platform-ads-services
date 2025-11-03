import { MailerService } from '@nestjs-modules/mailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

type EmailOptions = {
  to: string;
  subject: string;
  template: string; // name without extension, e.g. 'welcome'
  context: Record<string, any>;
};

const renderTemplate = (templateName: string, context: Record<string, any>) => {
  // At runtime this file lives in dist/helpers. Our templates are in dist/template.
  const templatePath = join(__dirname, '..', 'template', `${templateName}.hbs`);
  const source = readFileSync(templatePath, 'utf8');
  const compile = Handlebars.compile(source, { strict: true });
  return compile(context);
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
  const provider = (process.env.MAIL_PROVIDER || 'smtp').toLowerCase();

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || 'No Reply <no-reply@localhost>';
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set while MAIL_PROVIDER=resend');
    }

    // Lazy import to avoid adding weight when not used
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const html = renderTemplate(options.template, options.context);

    const result = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html,
    });

    if (result.error) {
      throw new Error(
        `Resend error: ${result.error.name || 'Unknown'} - ${
          result.error.message || 'No message'
        }`,
      );
    }
    return;
  }

  // Default: SMTP via Nest Mailer (Nodemailer)
  await mailerService.sendMail(options);
};
