function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function linkifyText(text: string, urls: string[]): string {
  let result = escapeHtml(text);

  for (const url of urls) {
    if (!url || !result.includes(escapeHtml(url))) {
      continue;
    }

    const safeHref = escapeHtml(url);
    result = result.replaceAll(
      escapeHtml(url),
      `<a href="${safeHref}" style="color:#2563eb;text-decoration:underline;">${safeHref}</a>`,
    );
  }

  return result;
}

function paragraphsFromPlainText(bodyText: string): string[] {
  return bodyText
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

type SimpleEmailHtmlInput = {
  paragraphs: string[];
  button?: {
    label: string;
    href: string;
  };
  linkUrls?: string[];
};

export function wrapEmailContentHtml(contentHtml: string): string {
  if (/<html[\s>]/i.test(contentHtml)) {
    return contentHtml;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
          <tr>
            <td style="padding:32px 28px;">
              ${contentHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildSimpleEmailHtml(input: SimpleEmailHtmlInput): string {
  const linkUrls = input.linkUrls ?? [];
  const paragraphHtml = input.paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n").map((line) => linkifyText(line, linkUrls));
      return `<p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">${lines.join("<br />")}</p>`;
    })
    .join("");

  const buttonHtml = input.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">
        <tr>
          <td>
            <a href="${escapeHtml(input.button.href)}" style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;">${escapeHtml(input.button.label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
          <tr>
            <td style="padding:32px 28px;">
              ${paragraphHtml}
              ${buttonHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailHtmlFromPlainText(
  bodyText: string,
  linkUrls: string[] = [],
): string {
  return buildSimpleEmailHtml({
    paragraphs: paragraphsFromPlainText(bodyText),
    linkUrls,
  });
}

export function buildReviewEmailHtmlFromPlainText(
  bodyText: string,
  reviewUrl: string,
  options?: { buttonLabel?: string },
): string {
  const buttonLabel = options?.buttonLabel ?? "Leave a review";
  const paragraphs = paragraphsFromPlainText(bodyText);

  return buildSimpleEmailHtml({
    paragraphs,
    button: {
      label: buttonLabel,
      href: reviewUrl,
    },
    linkUrls: [reviewUrl],
  });
}
