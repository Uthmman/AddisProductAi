
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles, PlusCircle, Trash2, MessageSquare, PanelLeft, X as XIcon, AlertCircle, Image as ImageIcon, Droplet } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fileToBase64, cn, applyWatermark, urlToDataUri } from '@/lib/utils';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductBotState, Settings } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


declare global {
  interface Window {
    Telegram: any;
  }
}

interface Message {
  role: 'user' | 'model';
  type: 'text' | 'image';
  content: string;
  tempId?: string;
  isLoading?: boolean;
  error?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  productState: ProductBotState;
  createdAt: number;
}

const getInitialProductState = (): ProductBotState => ({
  image_ids: [],
  image_srcs: [],
  original_image_data_uris: {},
});

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
  const [settings, setSettings] = useState<Settings | null>(null);
  const [applyWatermark, setApplyWatermark] = useState(true);

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

    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data: Settings = await res.json();
          setSettings(data);
          if (!data?.watermarkImageUrl) {
            setApplyWatermark(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    }
    fetchSettings();
  }, []);

  const storageKey = userId ? `chat_sessions_${userId}` : null;

  // Load sessions from localStorage
  useEffect(() => {
    if (isClient && storageKey) {
      const storedSessions = localStorage.getItem(storageKey);
      if (storedSessions) {
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: ChatSession) => ({
          ...s,
          messages: s.messages.map(m => ({...m, tempId: undefined, isLoading: undefined, error: undefined}))
        }));
        setSessions(parsedSessions);
        const lastActiveId = localStorage.getItem(`${storageKey}_last_active`);
        setActiveSessionId(lastActiveId || parsedSessions[0]?.id);
      } else {
        handleNewChat(false); // create initial chat without switching active id
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey]);

  // Save sessions to localStorage
  useEffect(() => {
    if (isClient && storageKey && sessions.length > 0) {
      try {
        const sessionsToSave = sessions.map(s => {
          const stateToSave: ProductBotState = { ...s.productState, original_image_data_uris: {} };
          return {
            ...s,
            messages: s.messages.filter(m => !m.isLoading && m.type === 'text'),
            productState: stateToSave
          }
        });
       localStorage.setItem(storageKey, JSON.stringify(sessionsToSave));
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded. Removing oldest session.');
          const sortedSessions = [...sessions].sort((a,b) => a.createdAt - b.createdAt);
          const oldestSessionId = sortedSessions[0]?.id;
          if(oldestSessionId) {
            setSessions(prev => prev.filter(s => s.id !== oldestSessionId));
             toast({
              title: "Storage space low",
              description: "Removed the oldest chat session to make space.",
            });
          }
        } else {
           console.error("Failed to save to localStorage:", e);
        }
      }
    }
    if (isClient && storageKey && activeSessionId) {
       try {
        localStorage.setItem(`${storageKey}_last_active`, activeSessionId);
      } catch (e) {
        console.error("Failed to save active session ID to localStorage:", e);
      }
    }
  }, [sessions, activeSessionId, isClient, storageKey, toast]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  
  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleBotResponse = (sessionId: string, response: { text: string; productState: ProductBotState; }) => {
     const botMessage: Message = { role: 'model', type: 'text', content: response.text };
     setSessions(prevSessions =>
        prevSessions.map(session =>
            session.id === sessionId 
            ? { ...session, messages: [...session.messages, botMessage], productState: response.productState } 
            : session
        )
    );
  }

  // Fetch initial welcome message for a new chat
  useEffect(() => {
    if (activeSession && activeSession.messages.length === 0 && !isLoading && activeSessionId) {
        setIsLoading(true);
        fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeSessionId, productState: activeSession.productState }),
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to get welcome message.");
            return res.json();
        })
        .then(data => handleBotResponse(activeSessionId, data))
        .catch(error => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not communicate with the bot.',
            });
        })
        .finally(() => {
            setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  
  const updateSessionTitle = (sessionId: string, title: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, title } : session
      )
    );
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText ?? input;
    if (!text || isLoading || !activeSessionId || !activeSession) return;

    const userMessage: Message = { role: 'user', type: 'text', content: text };
    
    setSessions(prevSessions =>
        prevSessions.map(s => s.id === activeSessionId ? {...s, messages: [...s.messages, userMessage]} : s)
    );
    
    if (input) setInput('');
    setIsLoading(true);

    try {
        const response = await fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId: activeSessionId, 
                newMessage: text,
                productState: activeSession.productState 
            }),
        });
        const data = await response.json();
        if (!response.ok) throw data;

        handleBotResponse(activeSessionId, data);
        
        if (activeSession.messages.length <= 1 && text) {
            updateSessionTitle(activeSessionId, text.substring(0, 30));
        }

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'An error occurred while sending the message.',
        });
         setSessions(prevSessions =>
            prevSessions.map(s => s.id === activeSessionId ? {...s, messages: activeSession.messages } : s)
        );
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleActionClick = (text: string) => {
    handleSendMessage(text);
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSessionId || !activeSession) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = await Promise.all(Array.from(files).map(async (file) => {
        const localPreviewUrl = await fileToBase64(file);
        const tempId = `upload-${Date.now()}-${Math.random()}`;
        return { file, tempId, localPreviewUrl };
    }));

    const placeholderMessages: Message[] = filesToUpload.map(({ tempId, localPreviewUrl }) => ({
        role: 'user',
        type: 'image',
        content: localPreviewUrl,
        tempId,
        isLoading: true,
    }));

    setSessions(prev => prev.map(s => s.id === activeSessionId
        ? { ...s, messages: [...s.messages, ...placeholderMessages] }
        : s
    ));

    const uploadResults = await Promise.all(filesToUpload.map(async ({ file, tempId }) => {
        try {
            const cleanDataUri = await fileToBase64(file);
            let imageToUploadUri = cleanDataUri;

            if (settings?.watermarkImageUrl && applyWatermark) {
              try {
                imageToUploadUri = await applyWatermark(cleanDataUri, settings.watermarkImageUrl, settings);
              } catch (watermarkError) {
                 toast({ variant: "destructive", title: "Watermark Failed", description: "Uploading original image." });
              }
            }

            const res = await fetch('/api/products/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageToUploadUri, image_name: file.name }),
            });
            const uploadedImage = await res.json();
            if (!res.ok) throw uploadedImage;

            setSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                const newMessages = s.messages.map(m => m.tempId === tempId ? { ...m, content: uploadedImage.src, isLoading: false, tempId: undefined } : m);
                const newProductState: ProductBotState = { ...getInitialProductState(), ...s.productState };
                if (!newProductState.image_ids.includes(uploadedImage.id)) {
                    newProductState.image_ids.push(uploadedImage.id);
                    newProductState.image_srcs.push(uploadedImage.src);
                    if (!newProductState.original_image_data_uris) {
                        newProductState.original_image_data_uris = {};
                    }
                    newProductState.original_image_data_uris[uploadedImage.id] = cleanDataUri;
                }
                return { ...s, messages: newMessages, productState: newProductState };
            }));
            return { success: true, image: uploadedImage };
        } catch (error: any) {
            setSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                const newMessages = s.messages.map(m => m.tempId === tempId ? { ...m, isLoading: false, error: error.message || 'Upload failed' } : m);
                return { ...s, messages: newMessages };
            }));
            return { success: false, error: error.message || 'Upload failed' };
        }
    }));
    
    const successfulUploads = uploadResults.filter(r => r.success);
    if (successfulUploads.length > 0) {
        toast({ title: 'Success!', description: `${successfulUploads.length} image(s) uploaded.` });
        await handleSendMessage('[Image Uploaded]');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewChat = (makeActive = true) => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      productState: getInitialProductState(),
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
          <Card className="flex-1 flex flex-col shadow-none border-0 rounded-none overflow-hidden">
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
            <CardContent className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                      const isBot = msg.role === 'model';
                      const showOptimizeButton = isBot && msg.content.includes("Ready to run AI optimization?");
                      const showCreateButtons = isBot && (msg.content.includes("create the product, or save it as a draft?") || msg.content.includes("save the changes, or save it as a draft?"));


                      return (
                          <div key={msg.tempId || index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {isBot && (
                                  <Avatar className="h-8 w-8">
                                      <AvatarFallback><Bot size={18} /></AvatarFallback>
                                  </Avatar>
                              )}
                              <div
                                  className={`max-w-xs md:max-w-md rounded-lg p-3 text-sm whitespace-pre-wrap relative ${
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
                                                    <Button size="sm" onClick={() => handleActionClick(activeSession.id.startsWith('session_edit_') ? 'Save Changes' : 'Create Product')}>
                                                      {activeSession.id.startsWith('session_edit_') ? 'Save Changes' : 'Create Product'}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => handleActionClick('Save as Draft')}>Save as Draft</Button>
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <>
                                          {msg.content ? (
                                            <Image src={msg.content} alt="Uploaded image" width={200} height={200} className={cn("rounded-md", (msg.isLoading || msg.error) && "opacity-50")} />
                                          ) : (
                                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded-md">
                                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                          )}
                                          {msg.isLoading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                                            </div>
                                          )}
                                          {msg.error && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/70 rounded-md p-2 text-destructive-foreground text-center">
                                                <AlertCircle className="h-6 w-6 mb-1" />
                                                <p className="text-xs font-bold">Upload Failed</p>
                                            </div>
                                          )}
                                      </>
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
            </CardContent>
            <div className="border-t p-4 bg-background">
              {settings?.watermarkImageUrl && (
                <div className="flex items-center space-x-2 justify-end mb-2">
                    <Switch
                        id="watermark-toggle"
                        checked={applyWatermark}
                        onCheckedChange={setApplyWatermark}
                        disabled={!settings.watermarkImageUrl}
                    />
                    <Label htmlFor="watermark-toggle" className="text-xs cursor-pointer flex items-center gap-1"><Droplet className="h-3 w-3" /> Apply Watermark</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
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
                  <Button onClick={() => handleSendMessage()} disabled={isLoading || !input}>
                      <Send className="h-4 w-4" />
                  </Button>
              </div>
            </div>
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
