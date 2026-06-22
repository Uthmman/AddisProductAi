"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, PlusCircle, RefreshCw, Terminal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

type Suggestion = {
  name: string;
  reason: string;
};

function SuggestionSkeleton() {
  return (
    <div className="mb-4">
        <h2 className="text-lg font-bold font-headline mb-2 flex items-center">
            <Lightbulb className="mr-2 h-5 w-5" />
            Suggested Products
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="p-4">
                       <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                         <Skeleton className="h-4 w-full mb-1" />
                         <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Skeleton className="h-9 w-32" />
                    </CardFooter>
                </Card>
            ))}
        </div>
        <Separator className="my-4" />
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
    setSuggestions([]);
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
      if (!err.message.includes('overloaded') && !err.message.includes('busy')) {
          console.error("Suggestion loading error:", err.message);
      }
      setError(err.message);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasFetched) {
      return (
        <div className="mb-4">
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center bg-card">
              <h3 className="text-lg font-bold font-headline">Get Product Ideas</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-md">Uncover new furniture opportunities based on customer searches.</p>
              <Button onClick={fetchSuggestions} disabled={isLoading} size="sm">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Suggest New Products
              </Button>
          </div>
          <Separator className="my-4" />
        </div>
      );
  }

  if (isLoading) {
    return <SuggestionSkeleton />;
  }

  return (
    <div className="mb-4">
      <div className="flex flex-row justify-between items-center mb-3 gap-4">
        <h2 className="text-lg font-bold font-headline flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-primary" />
            Suggested Products
        </h2>
        <Button variant="outline" onClick={fetchSuggestions} disabled={isLoading} size="xs" className="h-7 text-xs px-2">
            <RefreshCw className="mr-2 h-3 w-3" />
            Reload
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 py-2">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="text-sm">Suggestion Failed</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!error && !isLoading && suggestions.length === 0 && hasFetched && (
        <p className="text-xs text-muted-foreground text-center p-2">No new suggestions found.</p>
      )}

      {!error && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader className="p-4">
                <CardTitle className="text-base">{suggestion.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0">
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button asChild size="sm" className="w-full">
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
       <Separator className="my-4" />
    </div>
  );
}

ProductSuggestions.Skeleton = SuggestionSkeleton;
