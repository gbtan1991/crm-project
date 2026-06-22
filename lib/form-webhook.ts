export function formWebhookUrl(webhookToken: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/enquiries/${webhookToken}`;
}
