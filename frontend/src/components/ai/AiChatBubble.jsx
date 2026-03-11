import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAi } from '../../context/AiContext';
import {
  Bot, X, Settings, Send, Trash2, Loader2,
  CalendarDays, ListOrdered, Lightbulb, Square,
  AlertCircle,
} from 'lucide-react';

// ─── Quick Actions ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: 'Plan my day',
    icon: CalendarDays,
    prompt: 'Based on my tasks for today, create an optimized schedule for my work day. Consider priorities, estimated times, and suggest the best order to tackle them. Include short break suggestions.',
  },
  {
    label: 'Prioritize',
    icon: ListOrdered,
    prompt: 'Look at all my pending tasks and rank them by importance. Consider due dates, priority levels, and estimated time. Give me a clear top-5 list of what I should focus on first.',
  },
  {
    label: 'Quick tips',
    icon: Lightbulb,
    prompt: 'Based on my current workload and schedule, give me 3 short, actionable productivity tips I can use right now.',
  },
];

// ─── Simple Markdown Renderer ────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-bold text-sm mt-2 mb-1">{formatInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-bold text-sm mt-2 mb-1">{formatInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h3 key={i} className="font-bold text-base mt-2 mb-1">{formatInline(line.slice(2))}</h3>);
    }
    // Bullet lists
    else if (/^[\s]*[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[\s]*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => <li key={j} className="text-[13px]">{formatInline(item)}</li>)}
        </ul>
      );
      continue;
    }
    // Numbered lists
    else if (/^\d+[.)]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, j) => <li key={j} className="text-[13px]">{formatInline(item)}</li>)}
        </ol>
      );
      continue;
    }
    // Checkbox items
    else if (/^[\s]*(\[[ x]\])\s/.test(line)) {
      const checked = line.includes('[x]');
      const text = line.replace(/^[\s]*\[[ x]\]\s/, '');
      elements.push(
        <div key={i} className="flex items-start gap-1.5 my-0.5">
          <span className="mt-0.5">{checked ? '✅' : '⬜'}</span>
          <span className={`text-[13px] ${checked ? 'line-through text-gray-400' : ''}`}>{formatInline(text)}</span>
        </div>
      );
    }
    // Code blocks
    else if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${i}`} className="bg-gray-100 dark:bg-gray-700 rounded p-2 my-1 text-[11px] overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    }
    // Empty lines
    else if (!line.trim()) {
      elements.push(<div key={i} className="h-1" />);
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} className="text-[13px] my-0.5">{formatInline(line)}</p>);
    }

    i++;
  }

  return elements;
}

function formatInline(text) {
  // Bold: **text** or __text__
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Inline code: `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return <code key={`${i}-${j}`} className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-[12px]">{cp.slice(1, -1)}</code>;
      }
      return cp;
    });
  });
}

// ─── Chat Bubble Component ───────────────────────────────────────────────────

export default function AiChatBubble() {
  const { user } = useAuth();
  const {
    isOpen, toggleChat, setIsOpen,
    messages, sendMessage, clearConversation, stopGeneration,
    isLoading, error, isConfigured, openSettings,
  } = useAi();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Don't render if not logged in
  if (!user) return null;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all active:scale-95"
          title="AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[384px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="text-sm font-bold text-white">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={openSettings}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Hi {user.name?.split(' ')[0]}! How can I help?
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Ask me to plan your day, prioritize tasks, or give productivity tips
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-[13px] whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-[13px]">
                      {renderMarkdown(msg.content)}
                      {msg.streaming && !msg.content && (
                        <div className="flex items-center gap-1.5 py-1">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-gray-400">Thinking...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Error</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && !isLoading && (
            <div className="px-4 pb-2 flex gap-1.5">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your tasks..."
                rows={1}
                className="flex-1 resize-none px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none max-h-20 overflow-y-auto"
                style={{ minHeight: '38px' }}
              />
              {isLoading ? (
                <button
                  onClick={stopGeneration}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  title="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
