import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



/**
 * Formats an ISO date string or Date object into a readable format.
 * @param dateInput - The date to format (string or Date object).
 * @returns A formatted date string (e.g., "November 17, 2025") or an empty string if input is invalid.
 */
export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) {
    return 'N/A'; // Or return an empty string ''
  }

  try {
    const date = new Date(dateInput);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error("Failed to format date:", dateInput, error);
    return "Invalid Date";
  }
}