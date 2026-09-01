import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Bot, User, Loader2, AlertTriangle } from 'lucide-react';
import { assistantApi } from '../../api/map.api';
import { getErrorMessage } from '../../api/client';

const QUICK_PROMPTS = [
  'What should I do during a fire?',
  'Nearest shelter location',
  'How to report an emergency?',
  'First aid for burns',
  'Flood safety tips'
];

export default function PublicAiAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I\'m the CIRO Emergency Assistant. I can help you with safety information, emergency procedures, and finding nearby shelters. How can I help you?' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed || sending) return;

    const userMsg = { role: 'user', text: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setSending(true);

    try {
      const history = updated.slice(-10).map((m) => ({
        role: m.role, content: m.text
      }));
      const res = await assistantApi.chat(trimmed, history.slice(0, -1));
      const botReply = res?.reply || res?.message || 'I\'m sorry, I couldn\'t process your request right now. Please try again.';
      setMessages([...updated, { role: 'assistant', text: botReply }]);
    } catch (err) {
      console.error(getErrorMessage(err, 'AI assistant error'));
      setMessages([...updated, {
        role: 'assistant',
        text: 'I\'m experiencing technical difficulties. For emergencies, please call **1122** (Rescue) or **15** (Police) directly.'
      }]);
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-brand" /> Emergency Assistant
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          AI-powered help for emergencies, safety tips, and shelter information
        </p>
      </div>

      {/* Emergency banner */}
      <div className="flex items-start gap-3 rounded-xl border border-danger bg-danger-soft p-4">
        <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-danger">For immediate emergencies, call directly:</p>
          <p className="mt-1 text-xs text-danger">
            Rescue: <span className="font-bold">1122</span> · Police: <span className="font-bold">15</span> · Fire: <span className="font-bold">16</span> · Edhi: <span className="font-bold">115</span>
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div className="card overflow-hidden flex flex-col" style={{ height: 480 }}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                  <Bot className="h-4 w-4 text-brand" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand text-white rounded-br-sm'
                  : 'bg-surface text-ink rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20">
                  <User className="h-4 w-4 text-brand" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <Bot className="h-4 w-4 text-brand" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-surface px-4 py-3">
                <Loader2 className="h-4 w-4 text-ink-soft animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && (
          <div className="border-t border-line px-5 py-3">
            <p className="text-[10px] font-semibold text-ink-soft mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink-soft hover:bg-surface transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-line px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about emergency safety, shelters, procedures…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand/90 transition shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
