import TagForm from "@/components/tag-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type TagPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TagPageProps) {
    const { id } = await params;
    const isNew = id === 'new';
    return {
        title: isNew ? 'New Tag | Addis Product AI' : 'Edit Tag | Addis Product AI',
    };
}

export default async function TagEditorPage({ params }: TagPageProps) {
  const { id } = await params;
  const isNew = id === 'new';
  const tagId = isNew ? null : parseInt(id, 10);

  return (
    <div className="container mx-auto py-6 sm:py-10 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tags">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">
          {isNew ? 'Create New Tag' : 'Edit Product Tag'}
        </h1>
      </div>
      
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <TagForm tagId={tagId} />
      </div>
    </div>
  );
}
