import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unread, setUnread] = useState(0);
  const [unreadByUser, setUnreadByUser] = useState({});
  const [typingText, setTypingText] = useState('');
  const [error, setError] = useState('');
  const widgetRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const activeUserIdRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => { activeUserIdRef.current = activeChat?.user_id; }, [activeChat]);
  useEffect(() => { openRef.current = open; }, [open]);

  const canChat = user && ['doctor', 'assistant', 'nurse'].includes(user.role);
  if (!canChat) return null;

  useEffect(() => {
    if (!open) return;
    fetchContacts();
    fetchUnread();
  }, [open]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function requestOnline() { socket.emit('get_online_users'); }
    socket.on('connect', requestOnline);

    socket.on('new_message', (msg) => {
      // Message from the active contact → add to chat immediately
      if (msg.sender_id === activeUserIdRef.current && msg.receiver_id === user?.id) {
        setMessages(prev => [...prev, msg]);
        return;
      }
      // Message from someone else while chatting → badge on their contact
      if (msg.receiver_id === user?.id) {
        setUnreadByUser(prev => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
        api.get('/messages/unread-count').then(r => setUnread(r.data.count)).catch(() => {});
      }
    });

    socket.on('online_users', ({ userIds }) => setOnlineUsers(new Set(userIds)));
    socket.on('user_online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
    socket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
    });

    socket.on('typing', ({ senderId }) => {
      if (senderId === activeUserIdRef.current) {
        setTypingText('écrit...');
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingText(''), 3000);
      }
    });
    socket.on('stop_typing', ({ senderId }) => {
      if (senderId === activeUserIdRef.current) setTypingText('');
    });

    socket.emit('get_online_users');

    return () => {
      socket.off('connect', requestOnline);
      socket.off('new_message');
      socket.off('online_users');
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) setOpen(false);
    }
    if (open) setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) { setActiveChat(null); setMessages([]); setInput(''); setTypingText(''); }
  }, [open]);

  async function fetchContacts() {
    try {
      const res = await api.get('/messages/colleagues?type=internal');
      setContacts(res.data);
    } catch (err) { setError('Erreur chargement contacts'); }
  }

  async function fetchUnread() {
    try {
      const res = await api.get('/messages/unread-count');
      setUnread(res.data.count);
    } catch {}
  }

  function selectChat(contact) {
    if (contact.user_id === activeChat?.user_id) return;
    setActiveChat(contact);
    setMessages([]);
    setInput('');
    setTypingText('');
    setLoading(true);
    setUnreadByUser(prev => ({ ...prev, [contact.user_id]: 0 }));
    api.get(`/messages/${contact.user_id}`).then(res => {
      setMessages(res.data);
      setLoading(false);
    }).catch(() => { setError('Erreur chargement messages'); setLoading(false); });
  }

  function emitTyping() {
    const socket = getSocket();
    if (!socket || !activeChat) return;
    socket.emit('typing', { receiverId: activeChat.user_id });
    clearInterval(typingIntervalRef.current);
    typingIntervalRef.current = setInterval(() => socket.emit('typing', { receiverId: activeChat.user_id }), 2000);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      clearInterval(typingIntervalRef.current);
      socket.emit('stop_typing', { receiverId: activeChat.user_id });
    }, 2500);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeChat) return;
    try {
      const res = await api.post('/messages', { receiverId: activeChat.user_id, content: input });
      setMessages(prev => [...prev, res.data]);
      setInput('');
    } catch (err) { setError('Erreur envoi message'); }
  }

  const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' });
  }

  const roleLabel = { doctor: 'Médecin', assistant: 'Assistant', nurse: 'Infirmier' };

  return (
    <div ref={widgetRef} style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    }}>
      {open && (
        <div style={{
          width: 600, height: 520,
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', marginBottom: 8,
          display: 'flex', flexDirection: 'column',
          animation: 'slideUp 0.2s ease',
        }}>
          <div style={{
            background: '#1a56db', color: '#fff', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
              💬 Messagerie équipe
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, opacity: 0.8 }}
            >
              ×
            </button>
          </div>

          {error && (
            <div style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', fontSize: 12, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{
              width: 180, borderRight: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column', flexShrink: 0,
              background: '#f8fafc',
            }}>
              <div style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Contacts
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {contacts.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucun contact</div>
                ) : (
                  contacts.map(c => {
                    const active = activeChat?.user_id === c.user_id;
                    const badge = unreadByUser[c.user_id] || 0;
                    return (
                      <div
                        key={c.user_id}
                        onClick={() => selectChat(c)}
                        style={{
                          padding: '9px 12px', cursor: 'pointer',
                          borderLeft: active ? '3px solid #1a56db' : '3px solid transparent',
                          background: active ? '#eef2ff' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: onlineUsers.has(c.user_id) ? '#22c55e' : '#cbd5e1',
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1a202c', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.first_name}
                          </span>
                          {badge > 0 && (
                            <span style={{
                              background: '#ef4444', color: '#fff', borderRadius: 10,
                              padding: '1px 6px', fontSize: 10, fontWeight: 700, lineHeight: '16px',
                            }}>
                              {badge > 9 ? '9+' : badge}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 15, marginTop: 1 }}>
                          {roleLabel[c.role] || c.role}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {activeChat ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: onlineUsers.has(activeChat.user_id) ? '#22c55e' : '#cbd5e1',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{activeChat.first_name} {activeChat.last_name}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{roleLabel[activeChat.role] || activeChat.role}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', background: '#f8fafc' }}>
                  {loading ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Chargement...</div>
                  ) : sortedMessages.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucun message</div>
                  ) : (
                    sortedMessages.map((m, i) => {
                      const sent = m.sender_id === user?.id;
                      return (
                        <div key={m.id || i} style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: sent ? 'flex-end' : 'flex-start',
                          padding: '2px 12px',
                        }}>
                          <div style={{
                            maxWidth: '80%', padding: '7px 10px',
                            borderRadius: 14, fontSize: 13, lineHeight: 1.4,
                            background: sent ? '#dcf8c6' : '#fff',
                            border: sent ? 'none' : '1px solid #e2e8f0',
                            color: '#1a202c',
                          }}>
                            {m.content.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, padding: '0 2px' }}>
                            {formatTime(m.created_at)}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {typingText && (
                    <div style={{ padding: '3px 14px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                      {activeChat.first_name} {typingText}
                    </div>
                  )}
                </div>
                <form onSubmit={handleSend} style={{
                  display: 'flex', gap: 4, padding: '8px 12px',
                  borderTop: '1px solid #e2e8f0', flexShrink: 0,
                }}>
                  <input
                    style={{
                      flex: 1, border: '1px solid #e2e8f0', borderRadius: 18,
                      padding: '8px 14px', fontSize: 13, outline: 'none',
                    }}
                    placeholder="Écrivez..."
                    value={input}
                    onChange={e => { setInput(e.target.value); emitTyping(); }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: '#1a56db', color: '#fff', border: 'none',
                      borderRadius: 18, padding: '8px 16px', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Envoyer
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                Cliquez sur un contact
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#1a56db', color: '#fff', border: 'none',
          cursor: 'pointer', fontSize: 24, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(26,86,219,0.4)',
          position: 'relative',
        }}
      >
        {open ? '×' : '💬'}
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 22, height: 22, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
