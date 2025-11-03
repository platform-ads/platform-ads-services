import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailOptions = {
  to: string;
  subject: string;
  template: string; // name without extension, e.g. 'welcome' or 'verify-email'
  context: Record<string, any>;
};

/**
 * Mail Service to send emails via Laravel Mail Services
 */
@Injectable()
export class MailService {
  private laravelMailApiUrl: string;

  constructor(private configService: ConfigService) {
    this.laravelMailApiUrl =
      this.configService.get<string>('LARAVEL_MAIL_API_URL') ||
      'http://localhost:8000/api/mail/send';
  }

  /**
   * Send email asynchronously via Laravel API
   * This does not wait for Laravel to process the email
   */
  sendEmailAsync(options: EmailOptions): void {
    // Fire and forget - don't wait for response at all
    void fetch(this.laravelMailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(options),
    });

    // Log immediately without waiting
    console.log('Email request dispatched to Laravel (fire-and-forget):', {
      to: options.to,
      template: options.template,
    });
  }

  /**
   * Send email and await response from Laravel API
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const response = await fetch(this.laravelMailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Laravel Mail API returned ${response.status}: ${JSON.stringify(errorData)}`,
        );
      }

      const result = await response.json();
      console.log('Email queued successfully via Laravel:', {
        to: options.to,
        template: options.template,
        response: result,
      });
    } catch (error) {
      console.error('Failed to send email via Laravel API:', {
        to: options.to,
        template: options.template,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}
