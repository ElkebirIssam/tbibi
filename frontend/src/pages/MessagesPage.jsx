import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get('/messages/conversations').then(r => setConversations(r.data)).catch(() => {});
    if (user?.role === 'patient') {
      api.get('/patients/doctors').then(r => setDoctors(r.data)).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('new_message', (msg) => {
      if (activeChat && (msg.senderId === activeChat.user_id || msg.senderId === user?.id)) {
        setMessages(prev => [...prev, msg]);
      }
      fetchConversations();
    });
    return () => socket.off('new_message');
  }, [activeChat, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function fetchConversations() {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch {}
  }

  async function openChat(otherUserId) {
    const res = await api.get(`/messages/${otherUserId}`);
    setMessages(res.data);
    setActiveChat(conversations.find(c => c.user_id === otherUserId) || { user_id: otherUserId });
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

  async function startNewChat(doctorId) {
    setShowNewChat(false);
    await openChat(doctorId);
    fetchConversations();
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2>💬 Messagerie</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>Nouveau message</button>
      </div>

      <div className="messages-container">
        <div className="conversation-list">
          {conversations.map(c => (
            <div
              key={c.user_id}
              className={`conversation-item ${activeChat?.user_id === c.user_id ? 'active' : ''}`}
              onClick={() => openChat(c.user_id)}
            >
              <div className="name">{c.first_name} {c.last_name}</div>
              <div className="preview">{c.last_message?.substring(0, 40)}...</div>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center text-muted" style={{ padding: 20 }}>Aucune conversation</div>
          )}
        </div>

        <div className="chat-area">
          {activeChat ? (
            <>
              <div className="chat-header">
                {activeChat.first_name} {activeChat.last_name}
                {activeChat.role && <span className="badge badge-info" style={{ marginLeft: 8 }}>{activeChat.role}</span>}
              </div>
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`message ${m.sender_id === user?.id ? 'sent' : 'received'}`}>
                    <div className="bubble">{m.content}</div>
                    <div className="time">{new Date(m.created_at).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input" onSubmit={handleSend}>
                <input
                  className="form-input"
                  placeholder="Écrivez votre message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Envoyer</button>
              </form>
            </>
          ) : (
            <div className="text-center text-muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              Sélectionnez une conversation
            </div>
          )}
        </div>
      </div>

      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>Nouveau message</h2>
            {doctors.map(d => (
              <div
                key={d.id}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                onClick={() => startNewChat(d.user_id)}
              >
                Dr. {d.first_name} {d.last_name} - {d.specialization}
              </div>
            ))}
            {doctors.length === 0 && <p className="text-muted">Aucun médecin disponible</p>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowNewChat(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
