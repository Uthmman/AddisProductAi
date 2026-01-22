
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Paperclip, User, Bot, Sparkles, PlusCircle, Trash2, MessageSquare, PanelLeft, X as XIcon, Image as ImageIcon } from 'lucide-react';
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
  const [stagedImages, setStagedImages] = useState<Array<{ src: string; file: File }>>([]);
  const [isInitializingEdit, setIsInitializingEdit] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const handlePickerSelect = (data: any[]) => {
    const newImages = data.map(photo => ({
      src: photo.url,
      file: new File([], `google_photo_${photo.id || Date.now()}.jpg`, { type: 'image/jpeg' }),
    }));
    setStagedImages(prev => [...prev, ...newImages]);
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
      const storedSessions = localStorage.getItem(storageKey);
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
        const lastActiveId = localStorage.getItem(`${storageKey}_last_active`);
        if (lastActiveId) {
            setActiveSessionId(lastActiveId);
        } else if (JSON.parse(storedSessions).length > 0) {
            setActiveSessionId(JSON.parse(storedSessions)[0].id);
        } else {
            handleNewChat(true);
        }
      } else {
        handleNewChat(true); // create initial chat
      }
       setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey]);

  // Handle initializing an edit session from URL param
  useEffect(() => {
    if (!isClient || !storageKey) return;
    
    const editProductId = searchParams.get('editProductId');

    if (editProductId && !isInitializingEdit) {
      setIsInitializingEdit(true);

      const newSession: ChatSession = {
        id: `session_edit_${editProductId}_${Date.now()}`,
        title: 'Loading Product...',
        messages: [],
        createdAt: Date.now(),
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setIsLoading(true);

      fetch('/api/telegram/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId: newSession.id, editProductId: editProductId }),
      })
      .then(res => {
          if (!res.ok) {
            return res.json().then(err => { throw new Error(err.text || "Failed to initialize edit session.")});
          }
          return res.json();
      })
      .then(data => {
          const botMessage: Message = { role: 'model', type: 'text', content: data.text };
          updateSessionTitle(newSession.id, `Edit: ${data.productName}`);
          appendToSessionMessages(newSession.id, [botMessage]);
      })
      .catch(error => {
          toast({
              variant: 'destructive',
              title: 'Error Initializing Edit',
              description: error.message,
          });
      })
      .finally(() => {
          setIsLoading(false);
          setIsInitializingEdit(false);
          router.replace('/bot', {scroll: false}); 
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, storageKey, searchParams]);

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
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const updateSessionMessages = (sessionId: string, newMessages: Message[]) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, messages: newMessages } : session
      )
    );
  };

  const appendToSessionMessages = (sessionId: string, messagesToAppend: Message[]) => {
      setSessions(prevSessions =>
          prevSessions.map(session =>
              session.id === sessionId ? { ...session, messages: [...session.messages, ...messagesToAppend] } : session
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

  // Fetch initial welcome message for a new chat
  useEffect(() => {
    // Only fetch for new, non-edit chats
    if (activeSession && activeSession.messages.length === 0 && !isLoading && activeSessionId && !activeSession.id.startsWith('session_edit_')) {
        setIsLoading(true);
        fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeSessionId }),
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to get welcome message.");
            return res.json();
        })
        .then(data => {
            const botMessage: Message = { role: 'model', type: 'text', content: data.text };
            appendToSessionMessages(activeSessionId, [botMessage]);
        })
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


  const handleSendMessage = async () => {
    if ((!input && stagedImages.length === 0) || isLoading || !activeSessionId) return;

    const userMessages: Message[] = [];
    if (input) {
        userMessages.push({ role: 'user', type: 'text', content: input });
    }
    stagedImages.forEach(img => {
        userMessages.push({ role: 'user', type: 'image', content: img.src });
    });

    appendToSessionMessages(activeSessionId, userMessages);

    const firstUserMessage = !messages.some(m => m.role === 'user');
    if (firstUserMessage && input && !activeSessionId.startsWith('session_edit_')) {
        updateSessionTitle(activeSessionId, input.substring(0, 30));
    }

    const textToSend = input;
    const imagesToUpload = [...stagedImages];

    setInput('');
    setStagedImages([]);
    setIsLoading(true);

    try {
        let uploadedImageInfo: Array<{ id: number; src: string }> | undefined = undefined;
        if (imagesToUpload.length > 0) {
            toast({ description: `Uploading ${imagesToUpload.length} image(s)...` });
            const uploadPromises = imagesToUpload.map(async (image) => {
                const uploadResponse = await fetch('/api/products/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image_data: image.src, image_name: image.file.name }),
                });
                if (!uploadResponse.ok) throw await uploadResponse.json();
                return uploadResponse.json();
            });

            const uploadedImages = await Promise.all(uploadPromises);
            toast({ title: "Success!", description: `${uploadedImages.length} image(s) uploaded.` });
            uploadedImageInfo = uploadedImages.map(img => ({ id: img.id, src: img.src }));
        }

        const response = await fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeSessionId, newMessage: textToSend, images: uploadedImageInfo }),
        });

        const data = await response.json();
        if (!response.ok) throw data;

        const botMessage: Message = { role: 'model', type: 'text', content: data.text };
        appendToSessionMessages(activeSessionId, [botMessage]);

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
  
  const handleActionClick = async (text: string) => {
    if (isLoading || !activeSessionId) return;
    
    const userMessage: Message = { role: 'user', type: 'text', content: text };
    appendToSessionMessages(activeSessionId, [userMessage]);
    
    setIsLoading(true);
    try {
        const response = await fetch('/api/telegram/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeSessionId, newMessage: text }),
        });
        const data = await response.json();
        if (!response.ok) throw data;
        
        const botMessage: Message = { role: 'model', type: 'text', content: data.text };
        appendToSessionMessages(activeSessionId, [botMessage]);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Could not communicate with the bot.',
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const imageFiles = await Promise.all(Array.from(files).map(async file => ({
        src: await fileToBase64(file),
        file
    })));
    setStagedImages(prev => [...prev, ...imageFiles]);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const removeStagedImage = (index: number) => {
    setStagedImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleNewChat = (makeActive = true) => {
    const newSession: ChatSession = {
      id: `session_web_${Date.now()}`,
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
                        const showOptimizeButton = isBot && msg.content.includes("Should I go ahead and AI-optimize this content?");
                        const showCreateButtons = isBot && (msg.content.includes("create the product, or save it as a draft?") || msg.content.includes("save the changes, or save it as a draft?"));

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
                                                    <Button size="sm" onClick={() => handleActionClick(activeSession.id.startsWith('session_edit_') ? 'Save Changes' : 'Create Product')}>
                                                      {activeSession.id.startsWith('session_edit_') ? 'Save Changes' : 'Create Product'}
                                                    </Button>
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
                </CardContent>
                <div className="border-t p-4">
                    {stagedImages.length > 0 && (
                        <div className="p-2 border-b mb-4 flex flex-wrap gap-2">
                            {stagedImages.map((image, index) => (
                                <div key={index} className="relative">
                                    <Image src={image.src} alt="Staged image" width={64} height={64} className="rounded-md object-cover h-16 w-16" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                                        onClick={() => removeStagedImage(index)}
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" multiple />
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
                        <Button onClick={handleSendMessage} disabled={isLoading || (!input && stagedImages.length === 0)}>
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
