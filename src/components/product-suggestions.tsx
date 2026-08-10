"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, PlusCircle, RefreshCw, Terminal, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { cn } from "@/lib/utils";

type Suggestion = {
  name: string;
  reason: string;
};

function SuggestionSkeleton() {
  return (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-none shadow-sm bg-card/50">
                    <CardHeader className="p-4 pb-2">
                       <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 pb-4">
                         <Skeleton className="h-3 w-full mb-1" />
                         <Skeleton className="h-3 w-2/3" />
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Skeleton className="h-9 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
        <Separator className="my-6" />
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
        <div className="mb-6 flex justify-end">
            <Button 
                onClick={fetchSuggestions} 
                disabled={isLoading} 
                variant="ghost"
                size="sm"
                className="text-accent hover:text-primary hover:bg-primary/10 rounded-full px-4"
            >
                <Sparkles className="mr-2 h-4 w-4" />
                Find AI Product Gaps
            </Button>
        </div>
      );
  }

  if (isLoading) {
    return <SuggestionSkeleton />;
  }

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex flex-row justify-between items-center mb-4 gap-4">
        <h2 className="text-lg font-bold font-headline flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-full">
                <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            Recommended for Production
        </h2>
        <Button variant="ghost" onClick={fetchSuggestions} disabled={isLoading} className="h-8 text-xs px-2 hover:bg-muted">
            <RefreshCw className={cn("mr-2 h-3 w-3", isLoading && "animate-spin")} />
            Refresh Analysis
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4 py-2 border-none bg-destructive/10">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="text-sm font-bold">Analysis Offline</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {!error && !isLoading && suggestions.length === 0 && hasFetched && (
        <p className="text-xs text-muted-foreground text-center p-6 bg-muted/20 rounded-lg italic">
            Search data is fully covered. No new gaps identified today.
        </p>
      )}

      {!error && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="flex flex-col border-none shadow-md bg-card/60 backdrop-blur-sm group hover:shadow-lg transition-all">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base group-hover:text-primary transition-colors">{suggestion.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-4 pt-0 pb-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reason}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button asChild size="sm" className="w-full h-9 rounded-md">
                  <Link href={`/products/new?name=${encodeURIComponent(suggestion.name)}`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Start Prototype
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <Separator className="my-6 border-border/10" />
    </div>
  );
}

ProductSuggestions.Skeleton = SuggestionSkeleton;
