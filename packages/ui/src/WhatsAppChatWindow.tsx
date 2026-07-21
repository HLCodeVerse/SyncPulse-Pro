import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage } from '@webrtc/types';
import { Phone, Video, Search, Send, CheckCheck, Smile, Paperclip, MoreVertical, ShieldCheck, ArrowLeft } from 'lucide-react';

export interface WhatsAppChatWindowProps {
  currentUser: User;
  contacts: User[];
  messages: ChatMessage[];
  onSendDirectMessage: (targetUserId: string, text: string) => void;
  onInitiateCall: (targetUser: User, isVideo: boolean) => void;
}

export const WhatsAppChatWindow: React.FC<WhatsAppChatWindowProps> = ({
  currentUser,
  contacts,
  messages,
  onSendDirectMessage,
  onInitiateCall
}) => {
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRoomId = selectedContact
    ? [currentUser.id, selectedContact.id].sort().join('_chat_')
    : '';

  const activeMessages = messages.filter((m) => m.roomId === activeRoomId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && selectedContact) {
      onSendDirectMessage(selectedContact.id, inputText.trim());
      setInputText('');
    }
  };

  const getLastMessage = (contact: User) => {
    const roomId = [currentUser.id, contact.id].sort().join('_chat_');
    const msgs = messages.filter(m => m.roomId === roomId);
    return msgs[msgs.length - 1];
  };

  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[500px] rounded-2xl overflow-hidden flex glass-panel animate-fade-in">
      {/* Left: Contact List */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] flex-col border-r`} style={{ borderColor: 'hsl(var(--border))' }}>
        {/* Search Header */}
        <div className="p-4 space-y-3" style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: 'hsl(var(--text-primary))' }}>Messages</h3>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'hsl(var(--success-soft))', color: 'hsl(var(--success))' }}>
              <ShieldCheck size={11} /> E2EE
            </span>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-muted))' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full glass-input rounded-xl pl-9 pr-3 py-2.5 text-xs"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs" style={{ color: 'hsl(var(--text-muted))' }}>
              No contacts online. Open another tab to test!
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const lastMsg = getLastMessage(contact);
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200"
                  style={{
                    background: isSelected ? 'hsl(var(--accent-soft))' : 'transparent',
                    borderLeft: isSelected ? '3px solid hsl(var(--accent))' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'hsl(var(--bg-hover))'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="relative shrink-0">
                    <img
                      src={contact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.id}`}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full object-cover"
                      style={{ border: '2px solid hsl(var(--border))' }}
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        borderColor: 'hsl(var(--bg-card))',
                        background: contact.status === 'online' ? 'hsl(var(--success))'
                          : contact.status === 'in-call' ? 'hsl(var(--warning))'
                          : 'hsl(var(--text-muted))'
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[13px] font-semibold truncate" style={{ color: 'hsl(var(--text-primary))' }}>{contact.name}</h5>
                      {lastMsg && (
                        <span className="text-[10px] shrink-0" style={{ color: 'hsl(var(--text-muted))' }}>
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'hsl(var(--text-muted))' }}>
                      {lastMsg ? lastMsg.text : (contact.status === 'in-call' ? '🔴 In a call...' : 'Tap to start chatting')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Chat Panel */}
      {selectedContact ? (
        <div className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full`} style={{ background: 'hsl(var(--bg-primary))' }}>
          {/* Chat Header */}
          <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ background: 'hsl(var(--bg-card))', borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedContact(null)}
                className="md:hidden p-1.5 rounded-lg transition-colors"
                style={{ color: 'hsl(var(--accent))' }}
              >
                <ArrowLeft size={20} />
              </button>
              <img
                src={selectedContact.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedContact.id}`}
                alt={selectedContact.name}
                className="w-9 h-9 rounded-full object-cover"
                style={{ border: '2px solid hsl(var(--border))' }}
              />
              <div>
                <h4 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{selectedContact.name}</h4>
                <p className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(var(--success))' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--success))' }} />
                  {selectedContact.status === 'in-call' ? 'In Call' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onInitiateCall(selectedContact, false)}
                className="p-2.5 rounded-xl transition-all"
                style={{ color: 'hsl(var(--text-secondary))' }}
                onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--bg-hover))'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Voice Call"
              >
                <Phone size={18} />
              </button>
              <button
                onClick={() => onInitiateCall(selectedContact, true)}
                className="p-2.5 rounded-xl btn-accent flex items-center gap-1.5 text-xs font-semibold px-3"
              >
                <Video size={16} /> Call
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-2" style={{
            backgroundImage: 'radial-gradient(hsl(var(--border-subtle)) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}>
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 animate-float"
                  style={{ background: 'hsl(var(--accent-soft))', border: '1px solid hsl(var(--accent) / 0.2)' }}>
                  <ShieldCheck size={28} style={{ color: 'hsl(var(--accent))' }} />
                </div>
                <h5 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Start chatting with {selectedContact.name}</h5>
                <p className="text-xs mt-1 max-w-xs" style={{ color: 'hsl(var(--text-muted))' }}>
                  Messages are encrypted end-to-end via WebRTC DTLS-SRTP.
                </p>
              </div>
            ) : (
              activeMessages.map((msg, i) => {
                const isMe = msg.sender.id === currentUser.id;
                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up`} style={{ animationDelay: `${i * 20}ms` }}>
                    <div
                      className="max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm"
                      style={{
                        background: isMe ? 'hsl(var(--bubble-sent))' : 'hsl(var(--bubble-recv))',
                        color: 'hsl(var(--text-primary))',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      }}
                    >
                      <p className="break-words">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1" style={{ color: 'hsl(var(--text-muted))' }}>
                        <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={13} style={{ color: 'hsl(var(--success))' }} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 flex items-center gap-2 shrink-0" style={{ background: 'hsl(var(--bg-card))', borderTop: '1px solid hsl(var(--border))' }}>
            <button type="button" className="p-2 rounded-full transition-colors" style={{ color: 'hsl(var(--text-muted))' }}>
              <Smile size={20} />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${selectedContact.name}...`}
              className="flex-1 glass-input rounded-full px-4 py-2.5 text-[13px]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-full btn-accent disabled:opacity-40 disabled:transform-none disabled:shadow-none transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center animate-fade-in" style={{ color: 'hsl(var(--text-muted))' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 animate-float" style={{ background: 'hsl(var(--accent-soft))' }}>
            <ShieldCheck size={36} style={{ color: 'hsl(var(--accent))' }} />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>PulseCall Messenger</h3>
          <p className="text-xs mt-1">Select a contact to start a conversation.</p>
        </div>
      )}
    </div>
  );
};
