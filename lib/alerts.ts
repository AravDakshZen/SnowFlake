import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface AlertPayload {
  rootCause: string;
  affectedFile: string;
  confidence: number;
  prUrl?: string;
  investigationId: string;
  dashboardUrl: string;
}

export async function sendSlackAlert(
  webhookUrl: string,
  payload: AlertPayload
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔍 Tracewise Investigation Complete',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Root Cause:*\n${payload.rootCause}`,
              },
              {
                type: 'mrkdwn',
                text: `*Affected File:*\n${payload.affectedFile}`,
              },
              {
                type: 'mrkdwn',
                text: `*Confidence:*\n${payload.confidence}%`,
              },
              {
                type: 'mrkdwn',
                text: `*Investigation ID:*\n${payload.investigationId}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: payload.prUrl
                ? `<${payload.prUrl}|View PR>`
                : 'No PR created',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View in Dashboard',
                },
                url: payload.dashboardUrl,
              },
            ],
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[v0] Failed to send Slack alert:', error);
    return false;
  }
}

export async function sendEmailAlert(
  emailAddress: string,
  payload: AlertPayload
): Promise<boolean> {
  try {
    const htmlBody = `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🔍 Tracewise Investigation Complete</h2>
          <p>Your backend error has been analyzed and a fix is ready.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Root Cause:</strong><br/>${payload.rootCause}</p>
            <p><strong>Affected File:</strong><br/><code>${payload.affectedFile}</code></p>
            <p><strong>Confidence Score:</strong><br/>${payload.confidence}%</p>
            <p><strong>Investigation ID:</strong><br/><code>${payload.investigationId}</code></p>
          </div>

          ${
            payload.prUrl
              ? `<p><a href="${payload.prUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">View Pull Request</a></p>`
              : ''
          }

          <p><a href="${payload.dashboardUrl}" style="color: #3b82f6; text-decoration: underline;">View in Tracewise Dashboard</a></p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message from Tracewise.</p>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: 'Tracewise <noreply@tracewise.ai>',
      to: emailAddress,
      subject: `Error Fixed: ${payload.rootCause.substring(0, 50)}...`,
      html: htmlBody,
    });

    return !result.error;
  } catch (error) {
    console.error('[v0] Failed to send email alert:', error);
    return false;
  }
}

export async function sendEscalationAlert(
  slackWebhookUrl: string | null,
  emailAddress: string | null,
  investigationId: string,
  reason: string,
  dashboardUrl: string
): Promise<void> {
  const payload = {
    rootCause: `Investigation failed after 3 attempts: ${reason}`,
    affectedFile: 'N/A',
    confidence: 0,
    investigationId,
    dashboardUrl,
  };

  if (slackWebhookUrl) {
    await sendSlackAlert(slackWebhookUrl, payload);
  }

  if (emailAddress) {
    await sendEmailAlert(emailAddress, payload);
  }
}
