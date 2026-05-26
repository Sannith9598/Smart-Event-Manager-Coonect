import { useState, useRef, useEffect } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import { useSocket } from "../context/SocketContext";
import API from "../services/api";

// Renders the bell icon with unread count badge and a dropdown list of notifications
export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, setUnreadCount } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);
  const [allNotifications, setAllNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Refetch notifications when unread count changes (new notification arrived via socket)
  useEffect(() => {
    if (unreadCount > 0) {
      fetchNotifications();
    }
  }, [unreadCount]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Merge socket notifications with fetched ones
    if (notifications.length > 0) {
      setAllNotifications((prev) => {
        const newOnes = notifications.filter(
          (n) => !prev.find((p) => p.id === n.id)
        );
        return [...newOnes, ...prev];
      });
    }
  }, [notifications]);

  // Loads all notifications from the backend
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setAllNotifications(res.data.data || []);
    } catch (err) {
      // Silently fail - notifications are non-critical
    }
  };

  // Marks all notifications as read when user clicks "Mark all read"
  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/mark-all-read");
      markAllRead();
      setAllNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Failed to mark as read");
    }
  };

  // Marks a single notification as read when the user clicks on it
  const handleMarkOneRead = async (notifId) => {
    try {
      await API.put(`/notifications/${notifId}/read`);
      setAllNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read");
    }
  };

  // Removes a notification from the list when user clicks the X button
  const handleDeleteNotification = async (notifId, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/notifications/${notifId}`);
      const removed = allNotifications.find((n) => n.id === notifId);
      setAllNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (removed && !removed.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification");
    }
  };

  // Marks as read and navigates to the relevant page when a notification is clicked
  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkOneRead(notif.id);
    }
    if (notif.link) {
      window.location.href = notif.link;
      setShowDropdown(false);
    }
  };

  // Returns a human-readable relative time string like "5m ago" or "2d ago"
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Maps notification type to an emoji icon for visual context
  const getTypeIcon = (type) => {
    switch (type) {
      case "booking_new": return "📋";
      case "booking_confirmed": return "✅";
      case "booking_rejected": return "❌";
      case "booking_completed": return "🎉";
      case "booking_update": return "💰";
      case "verification_approved": return "🎊";
      case "verification_rejected": return "⚠️";
      case "message": return "💬";
      default: return "🔔";
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h6 className="mb-0">Notifications</h6>
            {unreadCount > 0 && (
              <button className="mark-read-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {allNotifications.length === 0 ? (
              <div className="notification-empty">
                <p>No notifications yet</p>
              </div>
            ) : (
              allNotifications.slice(0, 20).map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.isRead ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="notification-icon">{getTypeIcon(notif.type)}</span>
                  <div className="notification-content">
                    <p className="notification-title">{notif.title}</p>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">{getTimeAgo(notif.createdAt)}</span>
                  </div>
                  <button
                    className="notification-delete-btn"
                    onClick={(e) => handleDeleteNotification(notif.id, e)}
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notification-bell-wrapper {
          position: relative;
        }

        .notification-bell-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          cursor: pointer;
          position: relative;
          transition: 0.3s;
          padding: 0;
        }

        .notification-bell-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }

        .notification-dropdown {
          position: absolute;
          top: 45px;
          right: 0;
          width: 370px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 1050;
          overflow: hidden;
        }

        .notification-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mark-read-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 12px;
          cursor: pointer;
        }

        .mark-read-btn:hover {
          text-decoration: underline;
        }

        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-empty {
          padding: 30px;
          text-align: center;
          color: #94a3b8;
        }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 15px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
          cursor: pointer;
          position: relative;
        }

        .notification-item:hover {
          background: #f8fafc;
        }

        .notification-item.unread {
          background: #eff6ff;
        }

        .notification-item.unread:hover {
          background: #dbeafe;
        }

        .notification-icon {
          font-size: 20px;
          min-width: 30px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 13px;
          margin: 0;
          color: #1e293b;
        }

        .notification-message {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notification-time {
          font-size: 11px;
          color: #94a3b8;
        }

        .notification-delete-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
          align-self: center;
        }

        .notification-item:hover .notification-delete-btn {
          opacity: 1;
        }

        .notification-delete-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        body.dark-mode .notification-dropdown {
          background: #1e293b;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }

        body.dark-mode .notification-header {
          border-color: #374151;
          color: #e2e8f0;
        }

        body.dark-mode .notification-header h6 {
          color: #e2e8f0;
        }

        body.dark-mode .notification-item {
          border-color: #374151;
        }

        body.dark-mode .notification-item:hover {
          background: #2d3748;
        }

        body.dark-mode .notification-item.unread {
          background: #1e3a5f;
        }

        body.dark-mode .notification-item.unread:hover {
          background: #1e4a6f;
        }

        body.dark-mode .notification-title {
          color: #e2e8f0;
        }

        body.dark-mode .notification-message {
          color: #94a3b8;
        }

        body.dark-mode .notification-empty p {
          color: #64748b;
        }

        body.dark-mode .notification-delete-btn {
          color: #64748b;
        }

        body.dark-mode .notification-delete-btn:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
        }
      `}</style>
    </div>
  );
}
