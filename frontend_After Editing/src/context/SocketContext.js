import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000";

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  const connectSocket = useCallback(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const token = localStorage.getItem("token");

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    if (user && token) {
      const newSocket = io(SOCKET_URL, {
        transports: ["polling", "websocket"],
        auth: {
          token: token,
        },
      });

      newSocket.on("connect", () => {
        newSocket.emit("join", user.id);
      });

      newSocket.on("notification", (data) => {
        setNotifications((prev) => [{ ...data, id: Date.now() + Math.random(), isRead: false, createdAt: new Date() }, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      newSocket.on("new_message", (data) => {
        // Only increment unread count - the actual notification is already stored in DB
        // and will be fetched by NotificationBell. This avoids duplicate notifications.
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    connectSocket();

    // Listen for storage changes (login/logout in same tab)
    const handleStorageChange = () => {
      connectSocket();
    };

    window.addEventListener("storage", handleStorageChange);
    // Custom event for same-tab login/logout
    window.addEventListener("auth-change", handleStorageChange);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-change", handleStorageChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const reconnect = () => {
    connectSocket();
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, setUnreadCount, markAllRead, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
