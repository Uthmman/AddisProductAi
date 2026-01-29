
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles, PlusCircle, Trash2, MessageSquare, PanelLeft, X as XIcon, AlertCircle, Image as ImageIcon, Droplet, Save, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { fileToBase64, cn, urlToDataUri, applyWatermark } from '@/lib/utils';
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
import { ProductBotState, Settings, BotImageState, WooCategory } from '@/lib/types';
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
  error?: string;
  errorType?: string;
  retryAfter?: number;
  lastUserMessage?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  productState: ProductBotState;
  createdAt: number;
}

const getInitialProductState = (): ProductBotState => ({
  images: [],
});

function RetryAfterButton({ retryAfter, onRetry }: { retryAfter: number, onRetry: () => void }) {
    const [countdown, setCountdown] = useState(retryAfter);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleRetryClick = () => {
        setIsRetrying(true);
        onRetry();
    };

    return (
        <div className="mt-2">
            {countdown > 0 ? (
                <Button size="sm" variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Retry in {countdown}s
                </Button>
            ) : (
                <Button size="sm" onClick={handleRetryClick} disabled={isRetrying}>
                    {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Retry Now
                </Button>
            )}
        </div>
    );
}


export default function TelegramMiniAppPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [watermarkOnSave, setWatermarkOnSave] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<WooCategory[]>([]);

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

    async function fetchInitialData() {
      try {
        const [settingsRes, categoriesRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/products/categories?all=true')
        ]);
        
        if (settingsRes.ok) {
          const data: Settings = await settingsRes.json();
          setSettings(data);
          if (!data?.watermarkImageUrl) {
            setWatermarkOnSave(false);
          }
        }

        if (categoriesRes.ok) {
            setAvailableCategories(await categoriesRes.json());
        }

      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    }
    fetchInitialData();
  }, []);

  const storageKey = userId ? `chat_sessions_${userId}` : null;

  // Load sessions from localStorage
  useEffect(() => {
    if (isClient && storageKey) {
      const storedSessions = localStorage.getItem(storageKey);
      if (storedSessions) {
        const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: ChatSession) => ({
          ...s,
          messages: s.messages.map(m => ({...m, tempId: undefined, error: undefined}))
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
        const sessionsToSave = sessions.map(s => ({
            ...s,
            productState: {
                ...s.productState,
                images: s.productState.images.map(img => ({ ...img, dataUri: '' }))
            },
            messages: s.messages.filter(m => m.type === 'text')
        }));
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
  
  const handleBotResponse = (sessionId: string, response: { text: string; productState: ProductBotState; errorType?: string; retryAfter?: number; }, lastUserMessage?: string) => {
     const botMessage: Message = { 
        role: 'model', 
        type: 'text', 
        content: response.text,
        errorType: response.errorType,
        retryAfter: response.retryAfter,
        lastUserMessage: response.errorType === 'rate_limit' ? lastUserMessage : undefined
     };
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

  const handleSendMessage = async (messageText?: string, isRetry: boolean = false, stateOverride?: ProductBotState) => {
    const text = messageText ?? input;
    if (isLoading || isSaving || !activeSessionId || !activeSession) return;
    if (!text) return;

    if (!isRetry) {
        const userMessage: Message = { role: 'user', type: 'text', content: text };
        
        setSessions(prevSessions =>
            prevSessions.map(s => s.id === activeSessionId ? {...s, messages: [...s.messages, userMessage]} : s)
        );
        
        if (input) setInput('');
    }
    setIsLoading(true);

    const stateForApi = stateOverride || activeSession.productState;

    try {
        const response = await fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId: activeSessionId, 
                newMessage: text,
                productState: stateForApi 
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw errorData;
        }

        const data = await response.json();
        handleBotResponse(activeSessionId, data, text);
        
        if (activeSession.messages.length <= 1 && text) {
            updateSessionTitle(activeSessionId, text.substring(0, 30));
        }

    } catch (error: any) {
        if (error.errorType === 'rate_limit') {
            handleBotResponse(activeSessionId, error, text);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || error.text || 'An error occurred while sending the message.',
            });
             if (!isRetry) {
                setSessions(prev => prev.map(s => {
                    if (s.id === activeSessionId) {
                        return { ...s, messages: s.messages.slice(0, -1) };
                    }
                    return s;
                }));
            }
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleActionClick = (text: string) => {
    handleSendMessage(text);
  };

  const handleRetry = (messageToRetry: string, errorMsg: Message) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
        ? { ...s, messages: s.messages.filter(m => m !== errorMsg) }
        : s
    ));
    handleSendMessage(messageToRetry, true);
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeSessionId || !activeSession) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToProcess = await Promise.all(Array.from(files).map(async (file) => {
        const dataUri = await fileToBase64(file);
        const tempId = `upload-${Date.now()}-${Math.random()}`;
        return { dataUri, fileName: file.name, tempId };
    }));

    const placeholderMessages: Message[] = filesToProcess.map(({ dataUri, tempId }) => ({
        role: 'user', type: 'image', content: dataUri, tempId
    }));
    
    const newImageStates: BotImageState[] = filesToProcess.map(({dataUri, fileName}) => ({
        dataUri, fileName
    }));

    const nextProductState: ProductBotState = {
      ...activeSession.productState,
      images: [...(activeSession.productState.images || []), ...newImageStates]
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId
        ? { 
            ...s, 
            messages: [...s.messages, ...placeholderMessages],
            productState: nextProductState
        }
        : s
    ));
    
    await handleSendMessage('[Image Uploaded]', false, nextProductState);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProduct = async (status: 'publish' | 'draft') => {
    if (!activeSession) return;
    setIsSaving(true);
    try {
        const { productState } = activeSession;
        const { aiContent } = productState;

        if (!aiContent) {
            throw new Error("AI content must be generated before saving.");
        }

        const imageUploadPromises = productState.images.map(async (image) => {
            if (image.id) {
                return { id: image.id, src: image.src, alt: aiContent.images?.find(i => i.alt)?.alt || image.alt || productState.raw_name };
            }

            let imageToUploadUri = image.dataUri;
            if (applyWatermark && settings?.watermarkImageUrl) {
                try {
                    imageToUploadUri = await applyWatermark(image.dataUri, settings.watermarkImageUrl, settings);
                } catch (watermarkError: any) {
                    console.error("Watermark application failed:", watermarkError.message);
                }
            }

            const uploadResponse = await fetch('/api/products/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageToUploadUri, image_name: image.fileName }),
            });
            
            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(errorData.message || `Image upload failed for ${image.fileName}`);
            }

            const uploadedImage = await uploadResponse.json();
            const aiAlt = aiContent.images?.find(i => i.alt)?.alt;
            return { id: uploadedImage.id, src: uploadedImage.src, alt: aiAlt || productState.raw_name };
        });

        const finalImages = await Promise.all(imageUploadPromises);
        
        const finalCategories = aiContent.categories?.map(c => {
            const existing = availableCategories.find(cat => cat.name.toLowerCase() === c.toLowerCase());
            return existing ? { id: existing.id } : { name: c };
        }) || [];

        const finalData = {
            name: aiContent.name || productState.raw_name,
            sku: aiContent.sku,
            slug: aiContent.slug,
            regular_price: (aiContent.regular_price || productState.price_etb)?.toString(),
            description: aiContent.description,
            short_description: aiContent.short_description,
            categories: finalCategories,
            tags: aiContent.tags?.map(tag => ({ name: tag })),
            images: finalImages,
            attributes: aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
            meta_data: aiContent.meta_data,
            status: status,
        };
        
        const url = productState.editProductId ? `/api/products/${productState.editProductId}` : '/api/products';
        const method = productState.editProductId ? 'PUT' : 'POST';

        const saveResponse = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
        });

        if (!saveResponse.ok) {
            const errorData = await saveResponse.json();
            throw new Error(errorData.message || 'Failed to save product');
        }
        const savedProduct = await saveResponse.json();
        
        const message = productState.editProductId
          ? `Success! Product '${savedProduct.name}' updated.`
          : `Success! Product '${savedProduct.name}' created as a ${status}.`;

        toast({ title: 'Success!', description: message });
        handleNewChat(true);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message || 'An unexpected error occurred.' });
    } finally {
        setIsSaving(false);
    }
  }

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
                      const showSaveButtons = isBot && (msg.content.includes("create the product, or save it as a draft?") || msg.content.includes("save the changes, or save it as a draft?"));


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
                                          {showOptimizeButton && !isLoading && !isSaving && (
                                              <div className="mt-2">
                                                  <Button size="sm" onClick={() => handleActionClick('AI Optimize Now')}>
                                                      <Sparkles className="mr-2 h-4 w-4" />
                                                      AI Optimize Now
                                                  </Button>
                                              </div>
                                          )}
                                          {showSaveButtons && !isLoading && !isSaving && (
                                              <div className="mt-4 pt-4 border-t space-y-3">
                                                 {settings?.watermarkImageUrl && (
                                                    <div className="flex items-center space-x-2 justify-start">
                                                        <Switch id="watermark-toggle" checked={watermarkOnSave} onCheckedChange={setWatermarkOnSave} />
                                                        <Label htmlFor="watermark-toggle" className="text-xs cursor-pointer flex items-center gap-1"><Droplet className="h-3 w-3" /> Apply Watermark</Label>
                                                    </div>
                                                  )}
                                                  <div className="flex flex-wrap gap-2">
                                                      <Button size="sm" onClick={() => handleSaveProduct(activeSession.id.startsWith('session_edit_') ? 'publish' : 'publish')}>
                                                          <Save className="mr-2 h-4 w-4" />
                                                          {activeSession.id.startsWith('session_edit_') ? 'Save Changes' : 'Create Product'}
                                                      </Button>
                                                      <Button size="sm" variant="outline" onClick={() => handleSaveProduct('draft')}>
                                                          <Save className="mr-2 h-4 w-4" />
                                                          Save as Draft
                                                      </Button>
                                                  </div>
                                              </div>
                                          )}
                                           {msg.errorType === 'rate_limit' && msg.lastUserMessage && (
                                                <RetryAfterButton 
                                                    retryAfter={msg.retryAfter || 60} 
                                                    onRetry={() => handleRetry(msg.lastUserMessage!, msg)}
                                                />
                                            )}
                                      </div>
                                  ) : (
                                      <>
                                          {msg.content ? (
                                            <Image src={msg.content} alt="Uploaded image" width={200} height={200} className={cn("rounded-md", msg.error && "opacity-50")} />
                                          ) : (
                                            <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded-md">
                                                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                          )}
                                          {msg.error && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/70 rounded-md p-2 text-destructive-foreground text-center">
                                                <AlertCircle className="h-6 w-6 mb-1" />
                                                <p className="text-xs font-bold">{msg.error}</p>
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
                  {(isLoading || isSaving) && (messages.length === 0 || messages[messages.length - 1]?.role !== 'model' || !messages[messages.length - 1].content.includes('...')) && (
                       <div className="flex items-end gap-2">
                          <Avatar className="h-8 w-8">
                              <AvatarFallback><Bot size={18} /></AvatarFallback>
                          </Avatar>
                          <div className="max-w-xs md:max-w-md rounded-lg p-3 bg-muted flex items-center">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span className="ml-2 text-sm">{isSaving ? 'Saving...' : 'Thinking...'}</span>
                          </div>
                      </div>
                  )}
                </div>
            </CardContent>
            <div className="border-t p-4 bg-background">
              <div className="flex items-center gap-2">
                  <Input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      className="hidden"
                      multiple
                  />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isSaving}>
                      <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type product details..."
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isLoading || isSaving}
                  />
                  <Button onClick={() => handleSendMessage()} disabled={isLoading || isSaving || !input}>
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
