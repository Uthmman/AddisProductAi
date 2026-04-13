import PostForm from "@/components/post-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type PostPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PostPageProps) {
    const { id } = await params;
    const isNew = id === 'new';
    return {
        title: isNew ? 'New Post | Addis Product AI' : 'Edit Post | Addis Product AI',
    };
}

export default async function PostEditorPage({ params }: PostPageProps) {
  const { id } = await params;
  const isNew = id === 'new';
  const postId = isNew ? null : parseInt(id, 10);

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/posts">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">
          {isNew ? 'Create New Blog Post' : 'Edit Blog Post'}
        </h1>
      </div>
      
      <PostForm postId={postId} />
    </div>
  );
}
