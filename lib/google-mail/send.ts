type GmailSendInput = {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    data: ArrayBuffer;
  }>;
};

function base64UrlEncode(value: Buffer): string {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function encodeHeaderValue(value: string): string {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

function buildMimeMessage(input: GmailSendInput): string {
  const boundary = `mf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    input.bodyText,
  ];

  for (const attachment of input.attachments ?? []) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(attachment.data).toString("base64"),
    );
  }

  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

export class GmailSendError extends Error {
  constructor(
    message: string,
    readonly code: "INSUFFICIENT_SCOPES" | "NOT_CONNECTED" | "API_ERROR",
  ) {
    super(message);
    this.name = "GmailSendError";
  }
}

export async function sendGmailMessage(input: GmailSendInput): Promise<string> {
  const raw = base64UrlEncode(Buffer.from(buildMimeMessage(input), "utf8"));

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const reason =
      typeof error.error?.message === "string"
        ? error.error.message
        : "Gmail API request failed.";

    if (
      response.status === 403 &&
      /insufficient|scope|permission/i.test(reason)
    ) {
      throw new GmailSendError(
        "Reconnect Google to grant email sending permission.",
        "INSUFFICIENT_SCOPES",
      );
    }

    throw new GmailSendError(reason, "API_ERROR");
  }

  const data = (await response.json()) as { id?: string };
  if (!data.id) {
    throw new GmailSendError("Gmail API did not return a message id.", "API_ERROR");
  }

  return data.id;
}
