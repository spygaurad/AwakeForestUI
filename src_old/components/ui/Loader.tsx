import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have this shadcn/ui utility

interface LoaderProps {
  className?: string;
}

/**
 * A reusable loader component using a spinning lucide icon.
 */
export function Loader({ className }: LoaderProps) {
  return (
    <Loader2 className={cn('h-8 w-8 animate-spin text-primary', className)} />
  );
}