'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { Message } from '@/ai/flows/product-bot-flow';

const FormSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

type FormValues = z.infer<typeof FormSchema>;

// Helper to extract visible text from a message's content array
const getMessageText = (content: any[] | string): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    // Filter out parts that are not text or are empty.
    return content
      .map(part => {
        if (part.text) {
          return part.text;
        }
        // Don't render tool calls or tool responses in the main chat view
        if (part.toolCall || part.toolResponse) {
          return '';
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
};


export default function BotPage() {
  const { toast } = useToast();
  // State now stores the full Genkit history objects
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: [{ text: "Hi there! I can help you create a new product. What's the name and price of the product you'd like to add?" }] }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { message: '' },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const userMessageText = data.message;
    form.reset();

    // 1. Create the new user message object.
    const newUserMessage: Message = { role: 'user', content: [{ text: userMessageText }] };

    // 2. Create the full history to be sent to the server.
    const historyForAPI = [...messages, newUserMessage];

    // 3. Update the UI optimistically for responsiveness.
    setMessages(historyForAPI);
    setIsThinking(true);

    try {
      // 4. Call the server with the *complete* history and the new message text.
      const result = await productBotFlow({
        history: historyForAPI,
      });
      
      // 5. SYNC: Replace local state with the server's authoritative history.
      setMessages(result.newHistory);

      if (result.isCreated && result.product) {
         toast({
            title: "Product Created!",
            description: `Product "${result.product.name}" was created successfully.`,
            action: (
              <Button asChild variant="secondary">
                <Link href={`/products/${result.product.id}/view`}>View</Link>
              </Button>
            ),
         })
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
      // On error, revert to the state before the user message was sent
      setMessages(messages);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card className="h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6" /> Product Creation Bot
          </CardTitle>
          <CardDescription>
            Chat with the bot to create a new product. Just tell it the name and price.
          </CardDescription>
        </CardHeader>
        <CardContent ref={scrollAreaRef} className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6">
            {messages.map((msg, index) => {
              const textContent = getMessageText(msg.content);
              // Don't render messages that have no visible text content (e.g., tool calls)
              if (!textContent) return null;

              return (
                <div
                  key={index}
                  className={cn('flex items-start gap-4', {
                    'justify-end': msg.role === 'user',
                  })}
                >
                  {msg.role === 'model' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot size={18} /></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn('max-w-sm rounded-lg px-4 py-2', {
                      'bg-primary text-primary-foreground': msg.role === 'user',
                      'bg-muted': msg.role === 'model',
                    })}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {textContent}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                     <Avatar className="h-8 w-8">
                      <AvatarFallback><User size={18} /></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            {isThinking && (
                 <div className="flex items-start gap-4">
                     <Avatar className="h-8 w-8">
                        <AvatarFallback><Bot size={18} /></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-pulse" style={{animationDelay: '0s'}}></span>
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                            <span className="h-2 w-2 bg-foreground/50 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></span>
                        </div>
                    </div>
                 </div>
            )}
          </div>
        </CardContent>
        <div className="border-t p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center gap-2">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="e.g., Create a product called 'Leather Sofa' for 5000"
                        {...field}
                        autoComplete="off"
                        disabled={isThinking}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" size="icon" disabled={isThinking}>
                {isThinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
