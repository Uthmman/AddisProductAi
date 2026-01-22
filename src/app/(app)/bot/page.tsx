import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BotPageClient from '@/components/bot-page-client';

export const metadata = {
  title: 'Chatbot | Addis Product AI',
};

function BotPageSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl h-[calc(100vh-57px)] flex flex-col pt-6 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function BotPage() {
  return (
    <Suspense fallback={<BotPageSkeleton />}>
      <BotPageClient />
    </Suspense>
  );
}
