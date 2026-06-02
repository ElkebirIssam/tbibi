import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchContacts(); }, [user]);
  useEffect(() => { fetchConversations(); }, [user]);
  useEffect(() => {
    const contactIds = new Set(contacts.map(c => c.user_id));
    setFilteredConversations(conversations.filter(c => contactIds.has(c.user_id)));
  }, [conversations, contacts]);

  useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId && contacts.length > 0 && !activeChat) {
      const contact = contacts.find(c => c.user_id === userId);
      if (contact) openChat(userId);
    }
  }, [contacts, searchParams]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('new_message', (msg) => {
      if (activeChat && (msg.sender_id === activeChat.user_id || msg.sender_id === user?.id)) {
        setMessages(prev => [...prev, msg]);
      }
      fetchConversations();
    });
    return () => socket.off('new_message');
  }, [activeChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchContacts() {
    try {
      const res = await api.get('/messages/colleagues?type=external');
      setContacts(res.data);
    } catch { setContacts([]); }
  }

  async function fetchConversations() {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch {}
  }

  async function openChat(otherUserId) {
    const res = await api.get(`/messages/${otherUserId}`);
    setMessages(res.data);
    const contact = contacts.find(c => c.user_id === otherUserId);
    setActiveChat(contact || { user_id: otherUserId });
    setShowCompose(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      const res = await api.post('/messages', {
        receiverId: activeChat.user_id,
        content: newMessage,
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      fetchConversations();
    } catch {}
  }

  async function handleSendMail(e) {
    e.preventDefault();
    if (!composeTo || !composeContent.trim()) return;
    try {
      await api.post('/messages', {
        receiverId: composeTo,
        subject: composeSubject,
        content: composeContent,
      });
      setComposeTo('');
      setComposeSubject('');
      setComposeContent('');
      setShowCompose(false);
      fetchConversations();
    } catch {}
  }

  function openCompose() {
    setShowCompose(true);
    setActiveChat(null);
    setMessages([]);
  }

  function formatFullDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>📧 Messagerie externe</h2>
        <button className="btn btn-sm btn-primary" onClick={openCompose}>
          + Nouveau message
        </button>
      </div>

      <div className="messages-container">
        <div className="conversation-list">
          <div className="text-sm text-muted" style={{ padding: '8px 12px', fontWeight: 600 }}>Médecins</div>
          {contacts.map(c => {
            const conv = filteredConversations.find(fc => fc.user_id === c.user_id);
            return (
              <div
                key={c.user_id}
                className={`conversation-item ${activeChat?.user_id === c.user_id ? 'active' : ''}`}
                onClick={() => openChat(c.user_id)}
              >
                <div className="name">{c.first_name} {c.last_name}</div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                  {c.specialization && <span style={{ color: '#94a3b8' }}>{c.specialization}</span>}
                </div>
                {conv && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: conv.last_subject ? 600 : 400, color: conv.is_read === false && conv.message_type === 'received' ? '#1a56db' : '#94a3b8' }}>
                      {conv.last_subject || '(sans objet)'}
                    </span>
                    {' — '}{conv.last_message?.substring(0, 50)}
                  </div>
                )}
              </div>
            );
          })}
          {contacts.length === 0 && (
            <div className="text-center text-muted" style={{ padding: 20 }}>Aucun médecin disponible</div>
          )}
        </div>

        <div className="chat-area">
          {showCompose ? (
            <>
              <div className="chat-header">
                <button className="btn btn-sm btn-outline" onClick={() => setShowCompose(false)}>← Retour</button>
                <span style={{ marginLeft: 12, fontWeight: 600 }}>Nouveau message</span>
              </div>
              <form onSubmit={handleSendMail} style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label>Destinataire</label>
                  <select className="form-input" value={composeTo} onChange={e => setComposeTo(e.target.value)} required>
                    <option value="">— Choisir un médecin —</option>
                    {contacts.map(c => (
                      <option key={c.user_id} value={c.user_id}>
                        Dr. {c.first_name} {c.last_name}{c.specialization ? ` — ${c.specialization}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Objet</label>
                  <input className="form-input" placeholder="Objet du message" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label>Message</label>
                  <textarea
                    className="form-input"
                    style={{ flex: 1, minHeight: 160, resize: 'vertical' }}
                    placeholder="Rédigez votre message..."
                    value={composeContent}
                    onChange={e => setComposeContent(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCompose(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Envoyer</button>
                </div>
              </form>
            </>
          ) : activeChat ? (
            <>
              <div className="chat-header">
                <span style={{ fontWeight: 600 }}>{activeChat.first_name} {activeChat.last_name}</span>
                {activeChat.specialization && <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}>{activeChat.specialization}</span>}
              </div>
              <div className="chat-messages" style={{ background: '#f8fafc' }}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted" style={{ padding: 40 }}>Aucun message</div>
                ) : (
                  messages.map((m, i) => {
                    const isSent = m.sender_id === user?.id;
                    return (
                      <div key={i} style={{
                        background: '#fff', borderRadius: 8, padding: '16px 20px',
                        margin: '8px 16px', border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#2d3748' }}>
                            {isSent ? 'Moi' : `${m.sender_first_name || activeChat.first_name || ''} ${m.sender_last_name || activeChat.last_name || ''}`.trim() || 'Inconnu'}
                            {isSent && <span style={{ marginLeft: 6, fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(vous)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatFullDate(m.created_at)}</div>
                        </div>
                        {m.subject && (
                          <div style={{ fontWeight: 600, fontSize: 15, color: '#1a56db', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                            {m.subject}
                          </div>
                        )}
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4a5568', whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input" onSubmit={handleSend}>
                <input
                  className="form-input"
                  placeholder="Répondre..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Répondre</button>
              </form>
            </>
          ) : (
            <div className="text-center text-muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              Sélectionnez un médecin ou composez un nouveau message
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
