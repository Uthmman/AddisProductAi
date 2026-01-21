"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, PlusCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Suggestion = {
  name: string;
  reason: string;
};

function SuggestionSkeleton() {
  return (
    <div className="mb-8">
        <h2 className="text-2xl font-bold font-headline mb-4 flex items-center">
            <Lightbulb className="mr-2 h-6 w-6" />
            Suggested Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                       <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-4 w-full mb-2" />
                         <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-36" />
                    </CardFooter>
                </Card>
            ))}
        </div>
        <Separator className="my-8" />
    </div>
  );
}


export default function ProductSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/products/suggest-products');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch suggestions');
        }
        setSuggestions(data.suggestions || []);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  if (isLoading) {
    return <SuggestionSkeleton />;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold font-headline mb-4 flex items-center">
        <Lightbulb className="mr-2 h-6 w-6 text-primary" />
        Suggested Products
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <CardTitle>{suggestion.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/products/new?name=${encodeURIComponent(suggestion.name)}`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Product
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
       <Separator className="my-8" />
    </div>
  );
}

ProductSuggestions.Skeleton = SuggestionSkeleton;
