// One calm layout for every notification: heading, a few lines, one button. Tables and inline
// styles because email clients ignore most CSS. Colours match the app (see globals.css).

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type EmailContent = {
  heading: string;
  lines: string[];
  list?: string[];
  button?: { label: string; url: string };
  footer: string;
};

export function renderEmail(content: EmailContent): { html: string; text: string } {
  const lines = content.lines
    .map((l) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1b1a17;">${escape(l)}</p>`)
    .join("");
  const list = content.list?.length
    ? `<ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.6;color:#1b1a17;">${content.list.map((i) => `<li>${escape(i)}</li>`).join("")}</ul>`
    : "";
  const button = content.button
    ? `<p style="margin:8px 0 32px;"><a href="${escape(content.button.url)}" style="display:inline-block;background:#2c4a3e;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:6px;">${escape(content.button.label)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="nb">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escape(content.heading)}</title></head>
  <body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;">
      <tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;">
          <tr><td style="padding:40px 32px;">
            <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.25;color:#1b1a17;">${escape(content.heading)}</h1>
            ${lines}${list}${button}
            <p style="margin:0;font-size:13px;line-height:1.6;color:#5d5a53;">${escape(content.footer)}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.lines,
    ...(content.list?.length ? ["", ...content.list.map((i) => `– ${i}`)] : []),
    ...(content.button ? ["", `${content.button.label}: ${content.button.url}`] : []),
    "",
    content.footer,
  ].join("\n");

  return { html, text };
}
