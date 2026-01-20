'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles, PlusCircle, Trash2, MessageSquare, PanelLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fileToBase64, cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export default function TelegramMiniAppPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        setUserId(user && user.id ? String(user.id) : 'dev_user_123');
      } else {
        setUserId('dev_user_123');
      }
    } catch (error) {
       console.error("Failed to initialize Telegram WebApp:", error);
       setUserId('dev_user_123');
    }
  }, []);

  const storageKey = userId ? `chat_sessions_${userId}` : null;

  // Load sessions from localStorage
  useEffect(() => {
    if (isClient && storageKey) {
      const storedSessions = localStorage.getItem(storageKey);
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
        const lastActiveId = localStorage.getItem(`${storageKey}_last_active`);
        setActiveSessionId(lastActiveId || JSON.parse(storedSessions)[0]?.id);
      } else {
        handleNewChat(false); // create initial chat without switching active id
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey]);

  // Save sessions to localStorage
  useEffect(() => {
    if (isClient && storageKey && sessions.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
    if (isClient && storageKey && activeSessionId) {
       localStorage.setItem(`${storageKey}_last_active`, activeSessionId);
    }
  }, [sessions, activeSessionId, isClient, storageKey]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  
  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Fetch initial welcome message for a new chat
  useEffect(() => {
    if (activeSession && activeSession.messages.length === 0 && !isLoading) {
        sendBackendRequest(undefined, undefined, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);


  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, messages: newMessages } : session
      )
    );
  };
  
  const updateSessionTitle = (sessionId: string, title: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, title } : session
      )
    );
  };

  const sendBackendRequest = async (text?: string, images?: Array<{id: number, src: string}>, isWelcome: boolean = false) => {
    if (!activeSessionId) return;
    
    setIsLoading(true);

    let currentMessages = [...(sessions.find(s => s.id === activeSessionId)?.messages || [])];
    
    if (text) {
      const userMessage: Message = { role: 'user', type: 'text', content: text };
      currentMessages.push(userMessage);
      updateSessionMessages(activeSessionId, currentMessages);
      setInput('');
      // Set title from first user message
      if (currentMessages.filter(m => m.role === 'user').length === 1 && text) {
          updateSessionTitle(activeSessionId, text.substring(0, 30));
      }
    }

    try {
      const response = await fetch('/api/telegram/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeSessionId, newMessage: text, images }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.text || 'Failed to get response from bot.');
      }

      const botMessage: Message = { role: 'model', type: 'text', content: data.text };
      currentMessages.push(botMessage);
      updateSessionMessages(activeSessionId, currentMessages);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Could not communicate with the bot.',
      });
      // If it wasn't a welcome message, add user message back to input
      if(text && !isWelcome) setInput(text);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input || isLoading || !activeSessionId) return;
    await sendBackendRequest(input);
  };
  
  const handleActionClick = async (text: string) => {
    if (isLoading || !activeSessionId) return;
    await sendBackendRequest(text);
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeSessionId) return;

    setIsLoading(true);
    toast({ description: `Uploading ${files.length} image(s)...` });

    let currentMessages = [...(sessions.find(s => s.id === activeSessionId)?.messages || [])];
    const tempImageMessages: Message[] = [];

    for (const file of Array.from(files)) {
        const tempImageSrc = await fileToBase64(file);
        tempImageMessages.push({ role: 'user', type: 'image', content: tempImageSrc });
    }
    updateSessionMessages(activeSessionId, [...currentMessages, ...tempImageMessages]);

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
        
        // Remove temporary local images before sending to backend
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, messages: currentMessages} : s));
        await sendBackendRequest(undefined, imageInfos);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, messages: currentMessages} : s));
    } finally {
        setIsLoading(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewChat = (makeActive = true) => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    if (makeActive) {
      setActiveSessionId(newSession.id);
    }
  };
  
  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    const remainingSessions = sessions.filter(s => s.id !== sessionToDelete);
    setSessions(remainingSessions);

    if (activeSessionId === sessionToDelete) {
      setActiveSessionId(remainingSessions[0]?.id || null);
    }
    setSessionToDelete(null);
  };
  
  const handleNewChatAndClose = () => {
    handleNewChat(true);
    setIsSheetOpen(false);
  };

  const handleSelectAndClose = (sessionId: string) => {
      setActiveSessionId(sessionId);
      setIsSheetOpen(false);
  };
  
  if (!isClient) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderSidebar = () => (
    <div className="w-full md:w-64 flex-shrink-0 border-r-0 md:border-r bg-muted/20 flex flex-col h-full">
        <div className="p-2">
            <Button variant="outline" className="w-full" onClick={handleNewChatAndClose}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Chat
            </Button>
        </div>
        <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
                {sessions.sort((a, b) => b.createdAt - a.createdAt).map(session => (
                    <div
                        key={session.id}
                        onClick={() => handleSelectAndClose(session.id)}
                        className={cn(
                            "group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm",
                            activeSessionId === session.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"
                        )}
                    >
                        <div className="flex items-center gap-2 truncate">
                           <MessageSquare className="h-4 w-4 flex-shrink-0" />
                           <span className="truncate">{session.title}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setSessionToDelete(session.id); }}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
      </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex h-full">
        {renderSidebar()}
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full">
        {activeSession ? (
          <Card className="flex-1 flex flex-col shadow-none border-0 rounded-none">
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base truncate">
                <div className="md:hidden mr-2">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <SheetTrigger asChild>
                          <Button variant="ghost" size="icon">
                              <PanelLeft className="h-5 w-5" />
                          </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[300px] p-0 bg-muted/20">
                          <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
                          <SheetDescription className="sr-only">Select a chat or start a new one.</SheetDescription>
                          {renderSidebar()}
                      </SheetContent>
                  </Sheet>
                </div>
                <Bot /> <span className="truncate">{activeSession.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 p-4">
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
                  {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
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
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
             <MessageSquare className="h-12 w-12 mb-4" />
             <p className="text-lg font-medium">Select a chat or start a new one</p>
             <p className="text-sm">Your product creation sessions will be saved here.</p>
          </div>
        )}
      </div>

       <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this chat session. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSession} className={buttonVariants({ variant: "destructive" })}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
