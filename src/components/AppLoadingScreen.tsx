import { APP_NAME } from '@shared/app-config';

export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50">
      <div className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-4 mb-4 shadow-lg animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-800">{APP_NAME}</p>
      <p className="text-sm text-muted-foreground mt-1">Loading...</p>
    </div>
  );
}
