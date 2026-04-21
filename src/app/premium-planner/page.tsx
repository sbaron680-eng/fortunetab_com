import { Suspense } from 'react';
import PremiumPlannerFlow from '@/components/premium/PremiumPlannerFlow';

export const dynamic = 'force-static';

function Fallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-ft-ink" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <PremiumPlannerFlow />
    </Suspense>
  );
}
