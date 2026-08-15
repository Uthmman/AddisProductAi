"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, PlusCircle, RefreshCw, Terminal, Sparkles, BrainCircuit } from "lucide-react";
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
        <div className="mb-6">
            <Button 
                onClick={fetchSuggestions} 
                disabled={isLoading} 
                variant="outline"
                className="w-full sm:w-auto h-12 border-primary/20 bg-background/50 hover:bg-primary/5 rounded-md px-5 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-primary/5 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles className="mr-2 h-4 w-4 text-primary animate-bounce duration-1000" />
                <span className="font-bold text-xs uppercase tracking-wider">Analyze Market Gaps</span>
            </Button>
        </div>
      );
  }

  if (isLoading) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 max-w-xs text-center">
                <div className="relative">
                    <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
                    <RefreshCw className="absolute inset-0 h-12 w-12 text-primary/30 animate-spin" />
                </div>
                <h3 className="font-headline text-xl font-bold">Scanning Addis Market...</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Identifying unserved furniture needs based on latest search trends.</p>
            </div>
        </div>
    )
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-top-4 duration-700 mb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold font-headline flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
                <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            AI Production Recommendations
        </h2>
        <Button variant="ghost" onClick={fetchSuggestions} disabled={isLoading} className="h-9 text-xs px-3 hover:bg-primary/10 text-accent font-bold w-full sm:w-auto">
            <RefreshCw className={cn("mr-2 h-3 w-3", isLoading && "animate-spin")} />
            Re-Analyze Search Data
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-none bg-destructive/5 text-destructive ring-1 ring-destructive/20">
            <Terminal className="h-4 w-4" />
            <AlertTitle className="text-sm font-bold">Search Analysis Offline</AlertTitle>
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {!error && suggestions.length === 0 && hasFetched && (
        <div className="text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
            <p className="text-sm text-muted-foreground font-medium italic">
                Your current catalog covers all recent search trends perfectly.
            </p>
        </div>
      )}

      {!error && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="flex flex-col border-none shadow-xl bg-card/70 backdrop-blur-md group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ring-1 ring-primary/5">
              <CardHeader className="p-5 pb-2">
                <CardTitle className="text-lg text-accent group-hover:text-primary transition-colors leading-tight">{suggestion.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow p-5 pt-0 pb-6">
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{suggestion.reason}</p>
              </CardContent>
              <CardFooter className="p-5 pt-0">
                <Button asChild size="sm" className="w-full h-10 rounded-lg font-bold">
                  <Link href={`/products/new?name=${encodeURIComponent(suggestion.name)}`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Start Prototype Listing
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <div className="mt-10 mb-2 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  );
}

ProductSuggestions.Skeleton = SuggestionSkeleton;
