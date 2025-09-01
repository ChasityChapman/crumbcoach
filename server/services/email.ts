import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

interface PasswordResetEmailData {
  userEmail: string;
  userName: string;
  resetToken: string;
  expiryTime: Date;
}

interface AccountDeletionEmailData {
  userEmail: string;
  userName: string;
  deletionDate: Date;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = this.getEmailConfig();
    
    if (!emailConfig) {
      console.warn('Email service not configured - using console logging fallback');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  private getEmailConfig(): EmailConfig | null {
    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_SECURE,
      EMAIL_USER,
      EMAIL_PASS
    } = process.env;

    // Check if all required environment variables are present
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      return null;
    }

    return {
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT || '587'),
      secure: EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    };
  }

  /**
   * Send email with fallback to console logging in development
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      // Fallback to console logging in development
      console.log('📧 EMAIL FALLBACK (No email service configured):');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Text: ${options.text}`);
      console.log(`HTML: ${options.html}`);
      console.log('---');
      return true; // Return true for development purposes
    }

    try {
      const mailOptions = {
        from: `"CrumbCoach" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${data.resetToken}`;
    const expiryTimeFormatted = data.expiryTime.toLocaleString();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - CrumbCoach</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin-bottom: 10px;">🍞 CrumbCoach</h1>
          <h2 style="color: #666; font-weight: normal;">Password Reset Request</h2>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${data.userName},</p>
          
          <p>We received a request to reset your CrumbCoach account password. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #8B4513; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Your Password
            </a>
          </div>
          
          <p><strong>This link will expire on ${expiryTimeFormatted}</strong> (in 1 hour).</p>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>⚠️ Security Notice:</strong></p>
          <p style="margin: 5px 0 0 0;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged, and no further action is needed.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>This email was sent automatically by CrumbCoach.</p>
          <p>If you have questions, please contact our support team.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
CrumbCoach - Password Reset Request

Hello ${data.userName},

We received a request to reset your CrumbCoach account password.

To reset your password, visit this link:
${resetUrl}

This link will expire on ${expiryTimeFormatted} (in 1 hour).

If you didn't request this password reset, please ignore this email.

---
CrumbCoach Team
    `.trim();

    return await this.sendEmail({
      to: data.userEmail,
      subject: 'Reset Your CrumbCoach Password',
      html,
      text
    });
  }

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletionEmail(data: AccountDeletionEmailData): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Confirmation - CrumbCoach</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin-bottom: 10px;">🍞 CrumbCoach</h1>
          <h2 style="color: #666; font-weight: normal;">Account Deletion Confirmation</h2>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p>Hello ${data.userName},</p>
          
          <p>This email confirms that your CrumbCoach account has been successfully deleted on ${data.deletionDate.toLocaleDateString()}.</p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>✅ What has been deleted:</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your user account and profile information</li>
              <li>All your recipes and baking logs</li>
              <li>Timeline plans and bake notes</li>
              <li>Sensor readings and photos</li>
              <li>Sourdough starter logs</li>
              <li>All associated personal data</li>
            </ul>
          </div>
          
          <p>In accordance with GDPR and data privacy regulations, all your personal data has been permanently removed from our systems.</p>
          
          <p>If you have any questions about this deletion or believe this was done in error, please contact our support team within 7 days.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Thank you for being part of the CrumbCoach community.</p>
          <p>We're sorry to see you go!</p>
        </div>
      </body>
      </html>
    `;

    const text = `
CrumbCoach - Account Deletion Confirmation

Hello ${data.userName},

This email confirms that your CrumbCoach account has been successfully deleted on ${data.deletionDate.toLocaleDateString()}.

What has been deleted:
- Your user account and profile information
- All your recipes and baking logs
- Timeline plans and bake notes
- Sensor readings and photos
- Sourdough starter logs
- All associated personal data

In accordance with GDPR and data privacy regulations, all your personal data has been permanently removed from our systems.

If you have any questions about this deletion or believe this was done in error, please contact our support team within 7 days.

Thank you for being part of the CrumbCoach community.

---
CrumbCoach Team
    `.trim();

    return await this.sendEmail({
      to: data.userEmail,
      subject: 'CrumbCoach Account Deletion Confirmation',
      html,
      text
    });
  }

  /**
   * Send general notification email
   */
  async sendNotificationEmail(to: string, subject: string, message: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject} - CrumbCoach</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #8B4513; margin-bottom: 10px;">🍞 CrumbCoach</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
          <p>${message.replace(/\n/g, '</p><p>')}</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <p>This email was sent automatically by CrumbCoach.</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to,
      subject: `CrumbCoach - ${subject}`,
      html,
      text: message
    });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('Email service not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection test successful');
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;