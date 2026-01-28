
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles, PlusCircle, Trash2, MessageSquare, PanelLeft, X as XIcon, Image as ImageIcon, AlertCircle } from 'lucide-react';
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
import { useGooglePicker } from '@/hooks/use-google-picker';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ProductBotState } from '@/lib/types';


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
});

export default function BotPageClient() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isInitializingEdit, setIsInitializingEdit] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePickerSelect = (data: any[]) => {
     if (!activeSession) return;
     const photos = data.map(photo => ({
        file: new File([], `google_photo_${photo.id || Date.now()}.jpg`, { type: 'image/jpeg' }),
        src: photo.url
     }));
     handleImageUpload(photos);
  };

  const { openPicker, isPickerLoading } = useGooglePicker({
    onSelect: handlePickerSelect,
  });

  useEffect(() => {
    setIsClient(true);
    setUserId('webapp_user_123');
  }, []);

  const storageKey = userId ? `chat_sessions_${userId}` : null;

  // Load sessions from localStorage
  useEffect(() => {
    if (isClient && storageKey) {
      setIsLoading(true);
      try {
        const storedSessions = localStorage.getItem(storageKey);
        if (storedSessions) {
          const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: ChatSession) => ({
            ...s,
            messages: s.messages.map(m => ({ ...m, tempId: undefined, isLoading: false, error: undefined }))
          }));
          setSessions(parsedSessions);

          const lastActiveId = localStorage.getItem(`${storageKey}_last_active`);
          if (lastActiveId) {
              setActiveSessionId(lastActiveId);
          } else if (parsedSessions.length > 0) {
              setActiveSessionId(parsedSessions[0].id);
          } else {
              handleNewChat(true);
          }
        } else {
          handleNewChat(true); // create initial chat
        }
      } catch (error) {
        console.error("Failed to load from localStorage, resetting sessions.", error);
        localStorage.removeItem(storageKey);
        handleNewChat(true);
      } finally {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey]);

  // Handle initializing an edit session from URL param
  useEffect(() => {
    if (!isClient || !storageKey || !activeSessionId) return;
    
    const editProductId = searchParams.get('editProductId');

    if (editProductId && !isInitializingEdit) {
      setIsInitializingEdit(true);

      const newSession: ChatSession = {
        id: `session_edit_${editProductId}_${Date.now()}`,
        title: 'Loading Product...',
        messages: [],
        productState: getInitialProductState(),
        createdAt: Date.now(),
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setIsLoading(true);

      fetch('/api/telegram/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: newSession.id, editProductId: editProductId, productState: newSession.productState }),
      })
      .then(res => res.json())
      .then(data => {
          if (data.productName) {
            updateSessionTitle(newSession.id, `Edit: ${data.productName}`);
          }
          handleBotResponse(newSession.id, data);
      })
      .catch(error => {
          toast({
              variant: 'destructive',
              title: 'Error Initializing Edit',
              description: error.message || "Could not load product for editing.",
          });
      })
      .finally(() => {
          setIsLoading(false);
          setIsInitializingEdit(false);
          router.replace('/bot', {scroll: false}); 
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey, searchParams, activeSessionId]); // Depends on activeSessionId to ensure it runs after initial load

  // Save sessions to localStorage
  useEffect(() => {
    if (isClient && storageKey && sessions.length > 0) {
      try {
        const sessionsToSave = sessions.map(s => ({
          ...s,
          messages: s.messages.filter(m => !m.isLoading && m.type === 'text')
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
  
  const updateSessionTitle = (sessionId: string, title: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, title } : session
      )
    );
  };

  // Fetch initial welcome message for a new chat
  useEffect(() => {
    // Only fetch for new, non-edit chats
    if (activeSession && activeSession.messages.length === 0 && !isLoading && activeSessionId && !activeSession.id.startsWith('session_edit_')) {
        setIsLoading(true);
        fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeSessionId, productState: activeSession.productState }),
        })
        .then(res => res.json())
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


  const handleSendMessage = async (messageText?: string) => {
    const text = messageText ?? input;
    if (isLoading || !activeSessionId || !activeSession) return;
    if (!text) return;

    const userMessage: Message = { role: 'user', type: 'text', content: text };
    
    // Optimistically update UI
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
        
        const isFirstUserMessage = activeSession.messages.filter(m => m.role === 'user').length === 0;
        if (isFirstUserMessage && text && !activeSessionId.startsWith('session_edit_')) {
            updateSessionTitle(activeSessionId, text.substring(0, 30));
        }

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'An error occurred while sending the message.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleActionClick = (text: string) => {
    handleSendMessage(text);
  };
  
  const handleImageUpload = async (files: (File | {src: string, file: File})[]) => {
    if (!activeSessionId || !activeSession) return;

    const filesToUpload = await Promise.all(files.map(async (fileOrObj) => {
        const file = fileOrObj instanceof File ? fileOrObj : fileOrObj.file;
        const localPreviewUrl = file.size > 0 ? await fileToBase64(file) : (fileOrObj instanceof File ? '' : fileOrObj.src);
        const tempId = `upload-${Date.now()}-${Math.random()}`;
        return { fileOrObj, tempId, localPreviewUrl };
    }));

    const placeholderMessages: Message[] = filesToUpload.map(({ tempId, localPreviewUrl }) => ({
        role: 'user',
        type: 'image',
        content: localPreviewUrl,
        tempId,
        isLoading: true,
    }));

    // Add placeholders to UI
    setSessions(prev => prev.map(s => s.id === activeSessionId
        ? { ...s, messages: [...s.messages, ...placeholderMessages] }
        : s
    ));

    const uploadResults = await Promise.all(filesToUpload.map(async ({ fileOrObj, tempId }) => {
        try {
            const file = fileOrObj instanceof File ? fileOrObj : fileOrObj.file;
            const src = fileOrObj instanceof File ? await fileToBase64(file) : fileOrObj.src;

            const res = await fetch('/api/products/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: src, image_name: file.name }),
            });
            const uploadedImage = await res.json();
            if (!res.ok) throw uploadedImage;

            // Update placeholder on success
            setSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                const newMessages = s.messages.map(m => 
                    m.tempId === tempId 
                    ? { ...m, content: uploadedImage.src, isLoading: false, tempId: undefined } 
                    : m
                );
                const newProductState = { ...s.productState };
                if (!newProductState.image_ids.includes(uploadedImage.id)) {
                    newProductState.image_ids.push(uploadedImage.id);
                    newProductState.image_srcs.push(uploadedImage.src);
                }
                return { ...s, messages: newMessages, productState: newProductState };
            }));
            
            return { success: true, image: uploadedImage };
        } catch (error: any) {
            // Update placeholder on error
            setSessions(prev => prev.map(s => {
                if (s.id !== activeSessionId) return s;
                const newMessages = s.messages.map(m => 
                    m.tempId === tempId 
                    ? { ...m, isLoading: false, error: error.message || 'Upload failed' } 
                    : m
                );
                return { ...s, messages: newMessages };
            }));
            return { success: false, error: error.message || 'Upload failed' };
        }
    }));
    
    const successfulUploads = uploadResults.filter(r => r.success);
    if (successfulUploads.length > 0) {
      toast({ title: 'Success!', description: `${successfulUploads.length} of ${files.length} image(s) uploaded.` });
      // Notify the bot that images were uploaded
      await handleSendMessage('[Image Uploaded]');
    }

    const failedUploads = uploadResults.filter(r => !r.success);
    if (failedUploads.length > 0) {
        toast({
            variant: 'destructive',
            title: 'Upload Error',
            description: `${failedUploads.length} image(s) failed to upload.`,
        });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(Array.from(files));
    }
  };

  const handleNewChat = (makeActive = true) => {
    const newSession: ChatSession = {
      id: `session_web_${Date.now()}`,
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

  const renderSidebar = () => (
    <Card className="flex flex-col h-full border-0 md:border shadow-none md:shadow-sm rounded-none md:rounded-lg">
        <CardHeader>
            <Button variant="outline" className="w-full" onClick={handleNewChatAndClose}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Chat
            </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-2">
            <ScrollArea className="h-full">
                <div className="space-y-1">
                    {sessions.sort((a, b) => b.createdAt - a.createdAt).map(session => (
                        <div
                            key={session.id}
                            onClick={() => handleSelectAndClose(session.id)}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm",
                                activeSessionId === session.id ? "bg-muted font-semibold" : "hover:bg-muted/50"
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
        </CardContent>
    </Card>
  );

  if (!isClient || (isLoading && sessions.length === 0)) {
    return <div className="container mx-auto py-10 max-w-6xl flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto max-w-6xl h-[calc(100vh-57px)] flex flex-col pt-6">
        <div className="grid md:grid-cols-[280px_1fr] gap-6 flex-1 overflow-hidden">
             <div className="hidden md:block h-full">
                {renderSidebar()}
            </div>

            <Card className="flex flex-col h-full overflow-hidden">
            {activeSession ? (
                <>
                <CardHeader className="border-b flex flex-row items-center justify-between">
                     <CardTitle className="flex items-center gap-2 text-base truncate">
                        <div className="md:hidden mr-2">
                             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <PanelLeft className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-[300px] p-0">
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
                        const showOptimizeButton = isBot && msg.content.includes("AI Optimize Now");
                        const showCreateButtons = isBot && (msg.content.includes("create the product, or save it as a draft?") || msg.content.includes("save the changes, or save it as a draft?"));

                        return (
                            <div key={msg.tempId || index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {isBot && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot size={18} /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={`max-w-xs md:max-w-md rounded-lg text-sm ${
                                    msg.role === 'user'
                                        ? (msg.type === 'image' ? 'p-0 bg-transparent' : 'p-3 bg-primary text-primary-foreground')
                                        : 'p-3 bg-muted'
                                    } whitespace-pre-wrap relative`}
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
                <div className="border-t p-4">
                    <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={openPicker} disabled={isLoading || isPickerLoading}>
                            {isPickerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
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
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                    <MessageSquare className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">Select or create a chat</p>
                    <p className="text-sm">Start a new product creation session.</p>
                </div>
            )}
            </Card>
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
