type GmailSendInput = {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
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
  const hasHtml = Boolean(input.bodyHtml?.trim());
  const mixedBoundary = `mf_mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const alternativeBoundary = `mf_alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const hasAttachments = (input.attachments?.length ?? 0) > 0;

  const lines: string[] = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
  ];

  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, "");
  } else if (hasHtml) {
    lines.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, "");
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 7bit", "", input.bodyText);
    return lines.join("\r\n");
  }

  function appendAlternativeParts(boundary: string) {
    lines.push(
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.bodyText,
    );

    if (hasHtml) {
      lines.push(
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        input.bodyHtml ?? "",
      );
    }

    lines.push(`--${boundary}--`, "");
  }

  if (hasAttachments) {
    lines.push(`--${mixedBoundary}`);
    if (hasHtml) {
      lines.push(
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
        "",
      );
      appendAlternativeParts(alternativeBoundary);
    } else {
      lines.push(
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        input.bodyText,
        "",
      );
    }
  } else {
    appendAlternativeParts(alternativeBoundary);
  }

  const attachmentBoundary = hasAttachments ? mixedBoundary : null;
  for (const attachment of input.attachments ?? []) {
    lines.push(
      `--${attachmentBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(attachment.data).toString("base64"),
    );
  }

  if (attachmentBoundary) {
    lines.push(`--${attachmentBoundary}--`, "");
  }

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
