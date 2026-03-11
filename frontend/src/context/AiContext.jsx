import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { streamAiResponse } from '../utils/ai-service';
import { gatherAiContext, buildSystemPrompt } from '../utils/ai-context-builder';

const AiContext = createContext(null);

const SETTINGS_KEY = (userId) => `nnn_ai_settings_${userId}`;

export function AiProvider({ children }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Load settings from localStorage
  const getSettings = useCallback(() => {
    if (!user?.id) return null;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY(user.id));
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [user?.id]);

  const [settings, setSettingsState] = useState(() => {
    if (!user?.id) return null;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY(user.id));
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Re-load settings when user changes
  const refreshSettings = useCallback(() => {
    const s = getSettings();
    setSettingsState(s);
    return s;
  }, [getSettings]);

  const saveSettings = useCallback((newSettings) => {
    if (!user?.id) return;
    localStorage.setItem(SETTINGS_KEY(user.id), JSON.stringify(newSettings));
    setSettingsState(newSettings);
  }, [user?.id]);

  const clearSettings = useCallback(() => {
    if (!user?.id) return;
    localStorage.removeItem(SETTINGS_KEY(user.id));
    setSettingsState(null);
  }, [user?.id]);

  const isConfigured = !!(settings?.provider && settings?.apiKey);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev && !isConfigured) {
        // No key configured, open settings instead
        setIsSettingsOpen(true);
        return false;
      }
      return !prev;
    });
  }, [isConfigured]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.aborted = true;
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!user || !settings || isLoading) return;

    setError(null);

    // Add user message
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder assistant message
    const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now(), streaming: true };
    setMessages(prev => [...prev, assistantMsg]);
    setIsLoading(true);

    // Create abort token
    const abortToken = { aborted: false };
    abortRef.current = abortToken;

    try {
      // Gather fresh context
      const context = await gatherAiContext(user);
      const systemPrompt = buildSystemPrompt(user, context);

      // Build full message array for the API
      const conversationMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationMessages,
        { role: 'user', content: text },
      ];

      // Stream response
      let fullContent = '';
      for await (const token of streamAiResponse(settings, fullMessages)) {
        if (abortToken.aborted) break;
        fullContent += token;
        const currentContent = fullContent;
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], content: currentContent };
          }
          return updated;
        });
      }

      // Finalize the assistant message
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === 'assistant') {
          updated[lastIdx] = { ...updated[lastIdx], streaming: false };
        }
        return updated;
      });
    } catch (err) {
      console.error('AI message error:', err);
      setError(err.message);
      // Remove the empty assistant placeholder
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.role === 'assistant' && !updated[updated.length - 1]?.content) {
          updated.pop();
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [user, settings, isLoading, messages]);

  return (
    <AiContext.Provider value={{
      settings, saveSettings, clearSettings, refreshSettings, isConfigured,
      messages, sendMessage, clearConversation, stopGeneration,
      isOpen, toggleChat, setIsOpen,
      isSettingsOpen, openSettings, closeSettings,
      isLoading, error,
    }}>
      {children}
    </AiContext.Provider>
  );
}

export const useAi = () => useContext(AiContext);
