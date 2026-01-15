
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { Message, ProductBotOutput } from '@/ai/flows/product-bot-flow';

const FormSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});

type FormValues = z.infer<typeof FormSchema>;

export default function BotPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
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

  // Initial greeting from the bot
  useEffect(() => {
    const getInitialGreeting = async () => {
        setIsThinking(true);
        try {
            const result: ProductBotOutput = await productBotFlow({ messages: [] });
            if (result && result.messages) {
                setMessages(result.messages);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not get a response from the bot.',
            });
        } finally {
            setIsThinking(false);
        }
    };
    if (messages.length === 0) {
      getInitialGreeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const userMessage: Message = { role: 'user', content: data.message };
    const newMessages: Message[] = [...messages, userMessage];
    
    setMessages(newMessages);
    form.reset();
    setIsThinking(true);

    try {
      const result: ProductBotOutput = await productBotFlow({ messages: newMessages });

      if (result.messages) {
        setMessages(result.messages);
      }

      if (result.isProductCreated && result.product) {
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
        description: 'Could not get a response from the bot.',
      });
      // Optionally add an error message to the chat
      setMessages((prev) => [...prev, { role: 'bot', content: "Sorry, I'm having some trouble right now." }]);
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
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn('flex items-start gap-4', {
                  'justify-end': msg.role === 'user',
                })}
              >
                {msg.role === 'bot' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn('max-w-sm rounded-lg px-4 py-2', {
                    'bg-primary text-primary-foreground': msg.role === 'user',
                    'bg-muted': msg.role === 'bot',
                  })}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {typeof msg.content === 'string'
                      ? msg.content
                      : Array.isArray(msg.content)
                      ? msg.content.map((part: any) => part.text).join('')
                      : ''}
                  </p>
                </div>
                {msg.role === 'user' && (
                   <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={18} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
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
