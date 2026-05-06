import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export interface DiaryNote {
  id: string;
  weekday: string;
  note_date: string;
  note_time: string | null;
  title: string;
  content: string | null;
  reminder_at: string | null;
}

const safeName = (s: string) => s.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60) || 'note';

export function downloadNotePdf(note: DiaryNote) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.text(note.title || 'Untitled', 15, y);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${note.weekday} • ${note.note_date}${note.note_time ? ' • ' + note.note_time : ''}`, 15, y);
  y += 10;
  doc.setTextColor(0);
  doc.setFontSize(12);
  const lines = doc.splitTextToSize(note.content || '', 180);
  doc.text(lines, 15, y);
  doc.save(`${safeName(note.title)}.pdf`);
}

export function downloadFolderPdf(weekday: string, notes: DiaryNote[]) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text(`${weekday} Diary`, 15, 20);
  let y = 35;
  notes.forEach((note, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text(note.title || 'Untitled', 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${note.note_date}${note.note_time ? ' • ' + note.note_time : ''}`, 15, y);
    y += 7;
    doc.setTextColor(0);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(note.content || '', 180);
    lines.forEach((line: string) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 15, y);
      y += 6;
    });
    y += 6;
  });
  doc.save(`${safeName(weekday)}_diary.pdf`);
}

async function buildDocx(title: string, sections: DiaryNote[]): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
  ];
  sections.forEach((note) => {
    children.push(new Paragraph({ text: note.title || 'Untitled', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({
      children: [new TextRun({
        text: `${note.weekday} • ${note.note_date}${note.note_time ? ' • ' + note.note_time : ''}`,
        italics: true, color: '666666',
      })],
    }));
    (note.content || '').split('\n').forEach((line) => {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    });
    children.push(new Paragraph({ text: '' }));
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

export async function downloadNoteDocx(note: DiaryNote) {
  const blob = await buildDocx(note.title || 'Untitled', [note]);
  saveAs(blob, `${safeName(note.title)}.docx`);
}

export async function downloadFolderDocx(weekday: string, notes: DiaryNote[]) {
  const blob = await buildDocx(`${weekday} Diary`, notes);
  saveAs(blob, `${safeName(weekday)}_diary.docx`);
}

function fmtIcsDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

export function downloadReminderIcs(note: DiaryNote) {
  if (!note.reminder_at) return;
  const start = new Date(note.reminder_at);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const uid = `${note.id}@diary.lovable`;
  const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lovable Diary//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtIcsDate(new Date())}`,
    `DTSTART:${fmtIcsDate(start)}`,
    `DTEND:${fmtIcsDate(end)}`,
    `SUMMARY:${escape(note.title || 'Diary reminder')}`,
    `DESCRIPTION:${escape(note.content || '')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, `${safeName(note.title)}.ics`);
}
