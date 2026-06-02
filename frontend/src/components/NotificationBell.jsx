import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../services/socket';

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  const listenersAttached = useRef(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('tbibi_token');
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setUnread(r.data.count)).catch(() => {});

    axios.get(`${API}/api/notifications?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setNotifications(r.data.data)).catch(() => {});

    function attach() {
      const socket = getSocket();
      if (!socket || listenersAttached.current) return;
      socket.on('notification_count', (count) => setUnread(count));
      socket.on('notification', (n) => {
        setUnread(c => c + 1);
        setNotifications(prev => [n, ...prev].slice(0, 5));
      });
      listenersAttached.current = true;
    }
    attach();
    const retry = setInterval(attach, 2000);

    const handleUpdate = () => {
      axios.get(`${API}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => setUnread(r.data.count)).catch(() => {});
      axios.get(`${API}/api/notifications?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => setNotifications(r.data.data)).catch(() => {});
    };
    window.addEventListener('notification-update', handleUpdate);
    return () => {
      clearInterval(retry);
      window.removeEventListener('notification-update', handleUpdate);
      const socket = getSocket();
      if (socket) {
        socket.off('notification_count');
        socket.off('notification');
      }
      listenersAttached.current = false;
    };
  }, [token]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id) => {
    await axios.put(`${API}/api/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(c => Math.max(0, c - 1));
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="bell-btn" onClick={() => setOpen(!open)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <strong>Notifications</strong>
            <button className="btn-link" onClick={() => { navigate('/notifications'); setOpen(false); }}>Voir tout</button>
          </div>
          {notifications.length === 0 ? (
            <div className="dropdown-empty">Aucune notification</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`dropdown-item ${!n.is_read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleDateString('fr-TN')}</div>
              </div>
            ))
          )}
        </div>
      )}
      <style>{`
        .notification-bell { position: relative; }
        .bell-btn {
          background: none; border: none; cursor: pointer; position: relative; color: #4a5568; padding: 6px;
        }
        .bell-btn:hover { color: #2b6cb0; }
        .badge {
          position: absolute; top: 0; right: 0; background: #e53e3e; color: white; font-size: 10px;
          font-weight: 700; min-width: 16px; height: 16px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; padding: 0 4px; line-height: 1;
        }
        .dropdown-menu {
          position: absolute; right: 0; top: 100%; width: 320px; background: white; border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 1000; max-height: 400px; overflow-y: auto;
        }
        .dropdown-header {
          display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .btn-link {
          background: none; border: none; color: #2b6cb0; cursor: pointer; font-size: 13px; padding: 0;
        }
        .btn-link:hover { text-decoration: underline; }
        .dropdown-empty { padding: 24px; text-align: center; color: #a0aec0; font-size: 14px; }
        .dropdown-item {
          padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f7fafc; transition: background 0.15s;
        }
        .dropdown-item:hover { background: #f7fafc; }
        .dropdown-item.unread { background: #ebf8ff; }
        .dropdown-item.unread:hover { background: #bee3f8; }
        .notif-title { font-weight: 600; font-size: 13px; color: #2d3748; }
        .notif-msg { font-size: 12px; color: #718096; margin-top: 2px; }
        .notif-time { font-size: 11px; color: #a0aec0; margin-top: 4px; }
      `}</style>
    </div>
  );
}
