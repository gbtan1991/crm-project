const DEFAULT_REVIEW_STEP_HTML = `<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Guten Tag {{customerName}},
</p>

<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Vielen Dank, dass Sie sich für <strong>{{businessName}}</strong> entschieden haben. Wir hoffen, Sie hatten eine gute Erfahrung.
</p>

<p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Wenn Sie einen Moment Zeit haben, würden wir uns sehr über Ihr Feedback freuen. Ihre Bewertung hilft uns, uns zu verbessern, und gibt anderen Kunden eine Orientierung.
</p>

<p style="margin:0 0 24px;">
  <a
    href="{{reviewLink}}"
    style="display:inline-block;padding:12px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:4px;font:600 15px Arial,sans-serif;"
  >
    Bewertung abgeben
  </a>
</p>

<p style="margin:0;font:16px/1.6 Arial,sans-serif;color:#222;">
  Freundliche Grüsse<br>
  {{businessName}}
</p>`;

const DEFAULT_REVIEW_REMINDER_HTML = `<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Guten Tag {{customerName}},
</p>

<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Wir möchten Sie freundlich daran erinnern, uns Ihr Feedback zu <strong>{{businessName}}</strong> mitzuteilen.
</p>

<p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Es dauert nur eine Minute und hilft uns, uns weiter zu verbessern.
</p>

<p style="margin:0 0 24px;">
  <a
    href="{{reviewLink}}"
    style="display:inline-block;padding:12px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:4px;font:600 15px Arial,sans-serif;"
  >
    Bewertung abgeben
  </a>
</p>

<p style="margin:0;font:16px/1.6 Arial,sans-serif;color:#222;">
  Freundliche Grüsse<br>
  {{businessName}}
</p>`;

export function defaultReviewSequenceStepHtml(stepIndex = 0): string {
  return stepIndex === 0 ? DEFAULT_REVIEW_STEP_HTML : DEFAULT_REVIEW_REMINDER_HTML;
}

export function defaultReviewSequenceStepText(stepIndex = 0): string {
  if (stepIndex === 0) {
    return [
      "Guten Tag {{customerName}},",
      "",
      "Vielen Dank, dass Sie sich für {{businessName}} entschieden haben. Wir hoffen, Sie hatten eine gute Erfahrung.",
      "",
      "Wenn Sie einen Moment Zeit haben, würden wir uns sehr über Ihr Feedback freuen. Ihre Bewertung hilft uns, uns zu verbessern, und gibt anderen Kunden eine Orientierung.",
      "",
      "Bewertung abgeben: {{reviewLink}}",
      "",
      "Freundliche Grüsse",
      "{{businessName}}",
    ].join("\n");
  }

  return [
    "Guten Tag {{customerName}},",
    "",
    "Wir möchten Sie freundlich daran erinnern, uns Ihr Feedback zu {{businessName}} mitzuteilen.",
    "",
    "Es dauert nur eine Minute und hilft uns, uns weiter zu verbessern.",
    "",
    "Bewertung abgeben: {{reviewLink}}",
    "",
    "Freundliche Grüsse",
    "{{businessName}}",
  ].join("\n");
}

export function defaultDirectReviewHtml(isUpdateRequest = false): string {
  if (isUpdateRequest) {
    return `<p style="margin:0 0 16px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Guten Tag {{customerName}},
</p>

<p style="margin:0 0 24px;font:16px/1.6 Arial,sans-serif;color:#222;">
  Wir würden uns freuen, wenn Sie Ihre Bewertung für <strong>{{businessName}}</strong> aktualisieren könnten.
</p>

<p style="margin:0 0 24px;">
  <a
    href="{{link}}"
    style="display:inline-block;padding:12px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:4px;font:600 15px Arial,sans-serif;"
  >
    Bewertung aktualisieren
  </a>
</p>

<p style="margin:0;font:16px/1.6 Arial,sans-serif;color:#222;">
  Freundliche Grüsse<br>
  {{businessName}}
</p>`;
  }

  return DEFAULT_REVIEW_STEP_HTML.replaceAll("{{reviewLink}}", "{{link}}");
}
