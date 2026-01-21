"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, PlusCircle, RefreshCw } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSuggestions() {
    setIsLoading(true);
    setError(null);
    if (!hasFetched) {
        setHasFetched(true);
    }
    try {
      const res = await fetch('/api/products/suggest-products');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch suggestions.');
      }
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      console.error(err.message);
      setError("Could not fetch suggestions. Please ensure GSC is set up.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasFetched) {
      return (
        <div className="mb-8">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center bg-card">
              <h3 className="text-xl font-bold font-headline">Get Product Ideas</h3>
              <p className="text-muted-foreground mt-2 mb-4 max-w-md">Analyze your Google Search Console data to uncover new product opportunities based on what your customers are searching for.</p>
              <Button onClick={fetchSuggestions} disabled={isLoading}>
                  <Lightbulb className="mr-2 h-5 w-5" />
                  Suggest New Products
              </Button>
          </div>
          <Separator className="my-8" />
        </div>
      );
  }

  if (isLoading) {
    return <SuggestionSkeleton />;
  }

  return (
    <div className="mb-8">
      <div className="flex flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold font-headline flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-primary" />
            Suggested Products
        </h2>
        <Button variant="outline" onClick={fetchSuggestions} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
        </Button>
      </div>

      {error && <p className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</p>}

      {!error && suggestions.length === 0 && (
        <p className="text-muted-foreground text-center p-4">No new product suggestions found based on your current search data.</p>
      )}

      {suggestions.length > 0 && (
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
      )}
       <Separator className="my-8" />
    </div>
  );
}

ProductSuggestions.Skeleton = SuggestionSkeleton;
