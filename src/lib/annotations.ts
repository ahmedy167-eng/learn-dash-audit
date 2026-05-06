// Editing abbreviations for CA project annotations
export interface Abbreviation {
  code: string;
  meaning: string;
  colorClass: string; // tailwind classes using semantic-friendly soft tints
}

export const ABBREVIATIONS: Abbreviation[] = [
  { code: 'Gr', meaning: 'Grammar', colorClass: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-100' },
  { code: 'S/V', meaning: 'Subject/Verb agreement', colorClass: 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100' },
  { code: 'Ten', meaning: 'Incorrect tense', colorClass: 'bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
  { code: 'Prep', meaning: 'Preposition error', colorClass: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100' },
  { code: 'Art', meaning: 'Article', colorClass: 'bg-lime-200 text-lime-900 dark:bg-lime-900/40 dark:text-lime-100' },
  { code: 'Pl', meaning: 'Plural form', colorClass: 'bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-100' },
  { code: 'Cp', meaning: 'Capitalization', colorClass: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100' },
  { code: 'Pun', meaning: 'Punctuation', colorClass: 'bg-teal-200 text-teal-900 dark:bg-teal-900/40 dark:text-teal-100' },
  { code: 'Sp', meaning: 'Spelling error', colorClass: 'bg-cyan-200 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100' },
  { code: 'Wf', meaning: 'Wrong form', colorClass: 'bg-sky-200 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100' },
  { code: 'WO', meaning: 'Word order', colorClass: 'bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' },
  { code: 'Run-on', meaning: 'Run-on sentence', colorClass: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100' },
  { code: 'WW', meaning: 'Wrong word', colorClass: 'bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100' },
];

const CUSTOM_COLOR = 'bg-muted text-foreground';

export function getColorForAbbr(code: string): string {
  return ABBREVIATIONS.find(a => a.code.toLowerCase() === code.toLowerCase())?.colorClass || CUSTOM_COLOR;
}

export function getMeaningForAbbr(code: string): string {
  return ABBREVIATIONS.find(a => a.code.toLowerCase() === code.toLowerCase())?.meaning || 'Custom';
}

export function generateAnnotationId(): string {
  return `anno-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
