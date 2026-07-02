type OutlookSendInput = {
  accessToken: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    data: ArrayBuffer;
  }>;
};

export class OutlookSendError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFFICIENT_SCOPES" | "NOT_CONNECTED" | "API_ERROR",
  ) {
    super(message);
    this.name = "OutlookSendError";
  }
}

export async function sendOutlookMessage(
  input: OutlookSendInput,
): Promise<string> {
  const bodyHtml = input.bodyHtml?.trim();
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: bodyHtml ? "HTML" : "Text",
          content: bodyHtml || input.bodyText,
        },
        toRecipients: [
          {
            emailAddress: {
              address: input.to,
            },
          },
        ],
        attachments: (input.attachments ?? []).map((attachment) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: attachment.filename,
          contentType: attachment.contentType,
          contentBytes: Buffer.from(attachment.data).toString("base64"),
        })),
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const reason =
      typeof error.error?.message === "string"
        ? error.error.message
        : "Microsoft Graph sendMail request failed.";

    if (
      (response.status === 401 || response.status === 403) &&
      /scope|permission|privilege|consent/i.test(reason)
    ) {
      throw new OutlookSendError(
        "Reconnect Outlook to grant email sending permission.",
        "INSUFFICIENT_SCOPES",
      );
    }

    throw new OutlookSendError(reason, "API_ERROR");
  }

  return `outlook-${Date.now()}`;
}
