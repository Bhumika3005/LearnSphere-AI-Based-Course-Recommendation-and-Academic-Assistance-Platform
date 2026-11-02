"""
utils/email.py
─────────────────────────────────────────────────────────────────────────
Helper functions for sending automated emails.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import config

logger = logging.getLogger(__name__)


def send_welcome_email(name: str, email: str, temp_password: str, frontend_url: str = None) -> bool:
    """
    Sends a welcome email to a newly created user using SMTP configurations.
    If configuration is missing or SMTP sending fails, logs the error/warning.
    Does not raise exceptions, ensuring calling code behaves safely.
    """
    # 1. Validate SMTP configuration exists
    if not config.SMTP_HOST or not config.SMTP_USERNAME or not config.SMTP_PASSWORD:
        logger.warning(
            "SMTP configuration is missing (SMTP_HOST, SMTP_USERNAME, or SMTP_PASSWORD). "
            f"Could not send welcome email to {email}."
        )
        return False

    print("Email sending started.")

    base_url = frontend_url or config.FRONTEND_URL
    login_link = f"{base_url.rstrip('/')}/login"
    subject = "Welcome to LearnSphere!"

    # Plain text version for email clients that do not support HTML
    text_content = f"""Dear {name},

Welcome to LearnSphere! An account has been created for you by the Administrator.

Here are your registration details:
- Email/Username: {email}
- Temporary Password: {temp_password}

You can log in to your account here: {login_link}

IMPORTANT: For security purposes, please change your password immediately after your first login.

Best regards,
The LearnSphere Team
"""

    # HTML version of the email
    html_content = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
    <div style="background-color: #4A90E2; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <h2 style="margin: 0; font-size: 24px;">Welcome to LearnSphere</h2>
    </div>
    <div style="padding: 24px; background-color: #ffffff;">
      <p style="margin-top: 0;">Dear <strong>{name}</strong>,</p>
      <p>Welcome to LearnSphere! An account has been created for you by the Administrator.</p>
      
      <p>Here are your registered account details:</p>
      <div style="background-color: #f5f7fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4A90E2;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 100px;">Email:</td>
            <td style="padding: 4px 0; color: #555555;">{email}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Password:</td>
            <td style="padding: 4px 0; color: #555555; font-family: monospace; font-size: 14px;">{temp_password}</td>
          </tr>
        </table>
      </div>
      
      <p>You can access the application by clicking the button below:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="{login_link}" style="display: inline-block; background-color: #4A90E2; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 15px;" target="_blank">Log In to Your Account</a>
      </div>
      
      <div style="background-color: #fff9f0; border-left: 4px solid #ff9800; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #e65100; font-weight: bold;">
          ⚠️ Action Required
        </p>
        <p style="margin: 5px 0 0 0; color: #e65100; font-size: 14px;">
          For security purposes, please change your password immediately after your first login.
        </p>
      </div>
      
      <p style="margin-bottom: 0;">Best regards,<br/>The LearnSphere Team</p>
    </div>
    <div style="margin-top: 30px; font-size: 12px; color: #777777; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 15px;">
      This is an automated message. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
"""

    # 2. Assemble MIMEMultipart message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = config.SMTP_FROM
    msg['To'] = email

    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    # 3. Connect to the SMTP server and send the email
    try:
        port = int(config.SMTP_PORT or 587)
        use_ssl = (port == 465)

        logger.info(f"Connecting to SMTP server {config.SMTP_HOST}:{port} (SSL={use_ssl})")
        if use_ssl:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, port, timeout=10)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, port, timeout=10)
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception as tls_err:
                logger.warning(f"STARTTLS failed or not supported: {tls_err}. Proceeding without TLS.")

        if config.SMTP_USERNAME and config.SMTP_PASSWORD:
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)

        server.sendmail(config.SMTP_FROM, [email], msg.as_string())
        server.quit()
        print("Email sent successfully.")
        logger.info(f"Successfully sent welcome email to {email}")
        return True
    except Exception as e:
        print(f"SMTP Error: {str(e)}")
        logger.error(f"Failed to send welcome email to {email}: {str(e)}", exc_info=True)
        return False


def send_password_reset_email(name: str, email: str, reset_link: str) -> bool:
    """
    Sends a password reset link to the user.
    """
    if not config.SMTP_HOST or not config.SMTP_USERNAME or not config.SMTP_PASSWORD:
        logger.warning(
            f"SMTP configuration is missing. Could not send password reset email to {email}."
        )
        return False

    subject = "Reset Your Password - LearnSphere"

    text_content = f"""Dear {name},

We received a request to reset the password for your account.

You can reset your password by clicking the link below:
{reset_link}

If you did not request this, please ignore this email.

Best regards,
The LearnSphere Team
"""

    html_content = f"""<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <div style="background-color: #f59e0b; color: #ffffff; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <h2 style="margin: 0; font-size: 24px;">Reset Your Password</h2>
    </div>
    <div style="padding: 24px; background-color: #ffffff;">
      <p style="margin-top: 0;">Dear <strong>{name}</strong>,</p>
      <p>We received a request to reset the password for your account.</p>
      
      <p>Please click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="{reset_link}" style="display: inline-block; background-color: #f59e0b; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 15px;" target="_blank">Reset Password</a>
      </div>
      
      <p style="color: #777777; font-size: 14px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 13px; color: #0284c7;"><a href="{reset_link}">{reset_link}</a></p>
      
      <p style="margin-bottom: 0; margin-top: 20px;">Best regards,<br/>The LearnSphere Team</p>
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = config.SMTP_FROM
    msg['To'] = email

    msg.attach(MIMEText(text_content, 'plain'))
    msg.attach(MIMEText(html_content, 'html'))

    try:
        port = int(config.SMTP_PORT or 587)
        use_ssl = (port == 465)
        if use_ssl:
            server = smtplib.SMTP_SSL(config.SMTP_HOST, port, timeout=10)
        else:
            server = smtplib.SMTP(config.SMTP_HOST, port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        if config.SMTP_USERNAME and config.SMTP_PASSWORD:
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)

        server.sendmail(config.SMTP_FROM, [email], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        return False
