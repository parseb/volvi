import { ALPHA_MODE, getAlphaLimitsSummary } from '@/lib/alphaLimits';

export function AlphaNotice() {
  if (!ALPHA_MODE) return null;

  const limits = getAlphaLimitsSummary();

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            🧪 Alpha Launch - Limited Risk Mode
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              To ensure safe testing, the following limits are in effect:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {limits.map((limit, index) => (
                <li key={index}>{limit}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs italic">
              These limits will be increased as the protocol proves stable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AlphaNoticeCompact() {
  if (!ALPHA_MODE) return null;

  return (
    <div className="bg-yellow-100 border border-yellow-300 rounded-md p-3 text-sm text-yellow-800">
      <div className="flex items-center">
        <span className="mr-2">⚠️</span>
        <span className="font-medium">Alpha Mode:</span>
        <span className="ml-1">
          Limits apply (0.0001-0.01 ETH, 1-30 days, max 10 positions)
        </span>
      </div>
    </div>
  );
}

export function AlphaBadge() {
  if (!ALPHA_MODE) return null;

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
      🧪 Alpha
    </span>
  );
}
