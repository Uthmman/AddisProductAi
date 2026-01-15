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
import { Loader2, Send, Bot, User, MessageSquareWarning } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function BotPage() {
 
  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6" /> Product Creation Bot
          </CardTitle>
          <CardDescription>
            The web chat has been deactivated. Please use the Telegram bot for product creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert>
                <MessageSquareWarning className="h-4 w-4" />
                <AlertTitle>Functionality Moved</AlertTitle>
                <AlertDescription>
                    To interact with the product creation bot, please set up and use the Telegram bot associated with this application.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
