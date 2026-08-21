/**
 * Tiny PDF writer used only to give the demo catalogue real, openable files.
 * Real uploads store the user's own PDF untouched.
 */

function escapeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/([\\()])/g, "\\$1");
}

function wrap(text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > max) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

export function buildPlaceholderPdf(options: {
  title: string;
  authors: string;
  discipline: string;
  body: string;
}) {
  const lines: string[] = [];
  lines.push("BT /F1 26 Tf 64 720 Td 30 TL");
  for (const line of wrap(options.title, 34)) {
    lines.push(`(${escapeText(line)}) Tj T*`);
  }
  lines.push("ET");
  lines.push("BT /F1 12 Tf 64 640 Td 18 TL");
  lines.push(`(${escapeText(options.authors)}) Tj T*`);
  lines.push(`(${escapeText(options.discipline)}) Tj T*`);
  lines.push("ET");
  lines.push("0.6 w 64 610 m 531 610 l S");
  lines.push("BT /F1 11 Tf 64 570 Td 17 TL");
  for (const line of wrap(options.body, 72)) {
    lines.push(`(${escapeText(line)}) Tj T*`);
  }
  lines.push("ET");
  lines.push("BT /F1 9 Tf 64 90 Td");
  lines.push("(Acervo MBA Data Science - exemplar de demonstracao) Tj");
  lines.push("ET");

  const content = lines.join("\n");
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}
