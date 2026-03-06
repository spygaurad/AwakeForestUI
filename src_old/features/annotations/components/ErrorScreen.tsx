import Button from '@/components/ui/Button';

interface ErrorScreenProps {
  error: any;
  onBack: () => void;
}

export default function ErrorScreen({ error, onBack }: ErrorScreenProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <p className="text-red-600 mb-2">Error loading TIFF</p>
        <p className="text-sm text-gray-600">{error?.message || 'Unknown error'}</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    </div>
  );
}
