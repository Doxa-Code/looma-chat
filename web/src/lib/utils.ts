import { clsx, type ClassValue } from "clsx";
import {
  differenceInCalendarDays,
  differenceInDays,
  format,
  isToday,
  isYesterday,
} from "date-fns";
import { pt } from "date-fns/locale/pt";
import { twMerge } from "tailwind-merge";

export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const focusInput = [
  "focus:ring-2",
  "focus:ring-blue-200 dark:focus:ring-blue-700/30",
  "focus:border-blue-500 dark:focus:border-blue-700",
];

export const focusRing = [
  "outline outline-offset-2 outline-0 focus-visible:outline-2",
  "outline-blue-500 dark:outline-blue-500",
];

export const hasErrorInput = [
  "ring-2",
  "border-red-500 dark:border-red-700",
  "ring-red-200 dark:ring-red-700/30",
];

export function formatDay(date: Date) {
  if (isToday(date)) {
    return "Hoje";
  }

  if (isYesterday(date)) {
    return "Ontem";
  }

  if (differenceInDays(date, new Date()) < 7) {
    return format(date, "eeee", { locale: pt });
  }

  return format(date, "eee, dd 'de' MMM.", { locale: pt });
}

export function formatLastMessagemTime(date: Date): string {
  const now = new Date();

  if (isToday(date)) {
    return format(date, "HH:mm", { locale: pt });
  }

  if (isYesterday(date)) {
    return "Ontem";
  }

  const diffDias = differenceInCalendarDays(now, date);

  if (diffDias <= 6) {
    return format(date, "EEE", { locale: pt });
  }

  return format(date, "dd/MM/yyyy", { locale: pt });
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(1, "0")}:${String(s).padStart(2, "0")}`;
}
