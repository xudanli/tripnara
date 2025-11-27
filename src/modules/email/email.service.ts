import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private enabled: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@tripnara.com');
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'TridNara');

    if (this.enabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email service is disabled. Set EMAIL_ENABLED=true to enable.');
    }
  }

  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASS');
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      this.logger.warn(
        'SMTP configuration is incomplete. Email sending will be disabled.',
      );
      this.enabled = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // 验证连接
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection verification failed:', error);
        this.enabled = false;
      } else {
        this.logger.log('SMTP connection verified successfully');
      }
    });
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.warn(
        `Email sending is disabled. Would have sent email to ${options.to}`,
      );
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent successfully to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * 生成邀请邮件内容
   */
  generateInvitationEmail(data: {
    inviterName: string;
    journeyTitle: string;
    destination: string;
    invitationLink: string;
    message?: string;
    expiresAt: Date;
  }): { subject: string; html: string; text: string } {
    const expiryDate = data.expiresAt.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `${data.inviterName} 邀请您加入行程：${data.journeyTitle}`;

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>行程邀请</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">✈️ 行程邀请</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">您好！</p>
    
    <p style="font-size: 16px;">
      <strong>${data.inviterName}</strong> 邀请您加入行程：
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">${data.journeyTitle}</h2>
      <p style="margin: 0; color: #666; font-size: 14px;">📍 ${data.destination}</p>
    </div>
    
    ${data.message ? `<p style="font-size: 16px; background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">💬 ${data.message}</p>` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.invitationLink}" 
         style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        接受邀请
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      ⏰ 此邀请将在 <strong>${expiryDate}</strong> 过期
    </p>
    
    <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
      如果按钮无法点击，请复制以下链接到浏览器：<br>
      <a href="${data.invitationLink}" style="color: #667eea; word-break: break-all;">${data.invitationLink}</a>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>此邮件由 TripMind 自动发送，请勿回复。</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
行程邀请

您好！

${data.inviterName} 邀请您加入行程：${data.journeyTitle}
目的地：${data.destination}

${data.message ? `留言：${data.message}\n\n` : ''}
请点击以下链接接受邀请：
${data.invitationLink}

此邀请将在 ${expiryDate} 过期。

此邮件由 TripMind 自动发送，请勿回复。
    `.trim();

    return { subject, html, text };
  }
}

