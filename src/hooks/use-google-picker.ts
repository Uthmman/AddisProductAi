
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface UseGooglePickerProps {
  onSelect: (data: any[]) => void;
}

export function useGooglePicker({ onSelect }: UseGooglePickerProps) {
  const { toast } = useToast();
  const [isPickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [isGisLoaded, setGisLoaded] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const scope = ['https://www.googleapis.com/auth/photoslibrary.readonly'];

  useEffect(() => {
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => setGisLoaded(true);
    document.body.appendChild(gisScript);

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('picker', () => {
        setPickerApiLoaded(true);
      });
    };
    document.body.appendChild(gapiScript);

    return () => {
      document.body.removeChild(gisScript);
      document.body.removeChild(gapiScript);
    };
  }, []);

  const createPicker = useCallback(() => {
    if (!isPickerApiLoaded || !oauthToken) {
      return;
    }

    const view = new window.google.picker.View(window.google.picker.ViewId.PHOTOS);
    view.setMimeTypes('image/png,image/jpeg,image/jpg');
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setAppId(clientId)
      .setOAuthToken(oauthToken)
      .addView(view)
      .addView(new window.google.picker.DocsUploadView())
      .setDeveloperKey(apiKey)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          onSelect(data.docs);
        }
      })
      .build();
    picker.setVisible(true);
    setIsPickerLoading(false);
  }, [isPickerApiLoaded, oauthToken, clientId, apiKey, onSelect]);

  const openPicker = () => {
    if (!apiKey || !clientId) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Google API Key or Client ID is missing.',
      });
      return;
    }

    if (!isGisLoaded || !isPickerApiLoaded) {
      toast({
        variant: 'destructive',
        title: 'Loading...',
        description: 'Google Picker is not ready yet. Please try again in a moment.',
      });
      return;
    }

    setIsPickerLoading(true);

    if (oauthToken) {
      createPicker();
    } else {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scope.join(' '),
        callback: (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            setOauthToken(tokenResponse.access_token);
          }
          setIsPickerLoading(false);
        },
      });

      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
          setIsPickerLoading(false);
      }
    }
  };

  useEffect(() => {
    if (oauthToken) {
      createPicker();
    }
  }, [oauthToken, createPicker]);
  

  return { openPicker, isPickerLoading };
}
