'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fileToBase64 } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface Message {
  role: 'user' | 'model';
  type: 'text' | 'image';
  content: string;
}

export default function TelegramMiniAppPage() {
  const { toast } = useToast();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
          setChatId(String(user.id));
        } else {
           setChatId('dev_user_123');
        }
      } else {
        setChatId('dev_user_123');
      }
    } catch (error) {
       console.error("Failed to initialize Telegram WebApp:", error);
       setChatId('dev_user_123');
    }
  }, []);

  const sendBackendRequest = async (text?: string, images?: Array<{id: number, src: string}>) => {
    if (!chatId) return;
    
    if(text) {
        const userMessage: Message = { role: 'user', type: 'text', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/telegram/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, newMessage: text, images }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.text || 'Failed to get response from bot.');
      }

      const botMessage: Message = { role: 'model', type: 'text', content: data.text };
      setMessages(prev => [...prev, botMessage]);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not communicate with the bot.',
      });
      // Add user message back to input if it fails
      if(text) setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get initial welcome message from the bot
    if (chatId && messages.length === 0) {
        sendBackendRequest();
    }
    // This effect should only run once when chatId is set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

 useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async () => {
    if (!input || isLoading) return;
    await sendBackendRequest(input);
  };
  
  const handleActionClick = async (text: string) => {
    if (isLoading) return;
    await sendBackendRequest(text);
  };


  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    toast({ description: `Uploading ${files.length} image(s)...` });

    const newImageMessages: Message[] = [];
    for (const file of Array.from(files)) {
        const tempImageSrc = await fileToBase64(file);
        newImageMessages.push({ role: 'user', type: 'image', content: tempImageSrc });
    }
    setMessages(prev => [...prev, ...newImageMessages]);

    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            const image_data = await fileToBase64(file);
            const image_name = file.name;
            const uploadResponse = await fetch('/api/products/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data, image_name }),
            });
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.message || `Image upload failed for ${file.name}.`);
            }
            return uploadResponse.json();
        });

        const uploadedImages = await Promise.all(uploadPromises);
        
        toast({ title: "Success!", description: `${uploadedImages.length} image(s) uploaded.` });

        const imageInfos = uploadedImages.map(img => ({ id: img.id, src: img.src }));
        await sendBackendRequest(undefined, imageInfos);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        // remove placeholders on failure
        setMessages(prev => prev.slice(0, -newImageMessages.length));
    } finally {
        setIsLoading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  return (
    <div className="container mx-auto max-w-2xl py-4 h-screen flex flex-col">
       <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot /> Product Creation Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                 <div className="space-y-4">
                    {messages.map((msg, index) => {
                        const isBot = msg.role === 'model';
                        const showOptimizeButton = isBot && msg.content.includes("Should I go ahead and AI-optimize this content?");
                        const showCreateButtons = isBot && msg.content.includes("create the product, or save it as a draft?");

                        return (
                            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {isBot && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot size={18} /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={`max-w-xs md:max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap ${
                                    msg.role === 'user'
                                        ? (msg.type === 'image' ? 'p-1 bg-transparent' : 'bg-primary text-primary-foreground')
                                        : 'bg-muted'
                                    }`}
                                >
                                    {msg.type === 'text' ? (
                                        <div>
                                            <div dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                            {showOptimizeButton && !isLoading && (
                                                <div className="mt-2">
                                                    <Button size="sm" onClick={() => handleActionClick('AI Optimize Now')}>
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                        AI Optimize Now
                                                    </Button>
                                                </div>
                                            )}
                                            {showCreateButtons && !isLoading && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    <Button size="sm" onClick={() => handleActionClick('Create Product')}>Create Product</Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleActionClick('Save as Draft')}>Save as Draft</Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Image src={msg.content} alt="Uploaded image" width={200} height={200} className="rounded-md" />
                                    )}
                                </div>
                                {msg.role === 'user' && msg.type === 'text' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><User size={18} /></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        )
                    })}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                         <div className="flex items-end gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback><Bot size={18} /></AvatarFallback>
                            </Avatar>
                            <div className="max-w-xs md:max-w-md rounded-lg p-3 bg-muted flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                 </div>
            </ScrollArea>
            <div className="mt-auto pt-4 flex items-center gap-2">
                <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                    multiple
                />
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type product details..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !input}>
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
