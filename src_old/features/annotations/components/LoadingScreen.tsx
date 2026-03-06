export default function LoadingScreen() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
