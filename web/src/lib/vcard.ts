function escapeVCardValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function buildVCard(input: {
  fullName: string;
  organization?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  url?: string | null;
  note?: string | null;
}) {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`FN:${escapeVCardValue(input.fullName)}`);
  if (input.organization) {
    lines.push(`ORG:${escapeVCardValue(input.organization)}`);
  }
  if (input.title) {
    lines.push(`TITLE:${escapeVCardValue(input.title)}`);
  }
  if (input.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCardValue(input.phone)}`);
  }
  if (input.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(input.email)}`);
  }
  if (input.url) {
    lines.push(`URL:${escapeVCardValue(input.url)}`);
  }
  if (input.note) {
    lines.push(`NOTE:${escapeVCardValue(input.note)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
