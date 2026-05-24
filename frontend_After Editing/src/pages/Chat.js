import { useState, useEffect, useRef } from "react";
import { Container, Card, Form, Button, Spinner } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { FaPaperPlane } from "react-icons/fa";
import { toast } from "react-toastify";
import { useSocket } from "../context/SocketContext";
import AppNavbar from "../components/Navbar";
import API from "../services/api";

export default function Chat() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    fetchMessages();
    fetchBookingDetails();
  }, [bookingId]);

  useEffect(() => {
    if (socket && bookingId) {
      socket.emit("join_booking", bookingId);

      socket.on("receive_message", (data) => {
        if (data.bookingId === parseInt(bookingId) && data.senderId !== currentUser.id) {
          setMessages((prev) => [...prev, data]);
        }
      });

      socket.on("user_typing", (data) => {
        if (data.userId !== currentUser.id) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000);
        }
      });

      return () => {
        socket.off("receive_message");
        socket.off("user_typing");
        socket.emit("leave_booking", bookingId);
      };
    }
  }, [socket, bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await API.get(`/messages/booking/${bookingId}`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetails = async () => {
    try {
      const res = await API.get(`/booking/${bookingId}`);
      setBooking(res.data);

      // Determine the other user
      if (currentUser.role === "customer") {
        setOtherUser({ name: "Event Manager", role: "manager" });
      } else {
        setOtherUser({ name: "Customer", role: "customer" });
      }
    } catch (err) {
      console.error("Error fetching booking:", err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await API.post("/messages/send", {
        bookingId: parseInt(bookingId),
        message: newMessage.trim(),
      });

      const sentMessage = res.data.data;
      setMessages((prev) => [...prev, sentMessage]);
      setNewMessage("");

      // Emit via socket for real-time
      if (socket) {
        socket.emit("send_message", {
          ...sentMessage,
          bookingId: parseInt(bookingId),
          senderName: currentUser.name,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit("typing", { bookingId: parseInt(bookingId), userId: currentUser.id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <>
        <AppNavbar />
        <Container className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading chat...</p>
        </Container>
      </>
    );
  }

  return (
    <>
      <AppNavbar />
      <Container className="py-4" style={{ maxWidth: "800px" }}>
        <Card className="chat-card">
          <Card.Header className="chat-header">
            <div className="d-flex align-items-center gap-3">
              <Button variant="link" onClick={() => navigate(-1)} className="text-decoration-none p-0">
                ← Back
              </Button>
              <div>
                <h6 className="mb-0">💬 Booking Chat #{bookingId}</h6>
                <small className="text-muted">
                  {booking?.event?.name || "Event"} • {otherUser?.name || "User"}
                </small>
              </div>
            </div>
          </Card.Header>

          <Card.Body className="chat-messages">
            {messages.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.senderId === currentUser.id;
                const showDate =
                  idx === 0 ||
                  formatDate(msg.createdAt) !== formatDate(messages[idx - 1].createdAt);

                return (
                  <div key={msg.id || idx}>
                    {showDate && (
                      <div className="chat-date-divider">
                        <span>{formatDate(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`chat-bubble ${isMine ? "mine" : "theirs"}`}>
                      <p className="mb-0">{msg.message}</p>
                      <span className="chat-time">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
            {isTyping && (
              <div className="chat-bubble theirs typing">
                <span>typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Card.Body>

          <Card.Footer className="chat-input-area">
            <Form
              className="d-flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <Form.Control
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                disabled={sending}
              />
              <Button type="submit" variant="primary" disabled={sending || !newMessage.trim()}>
                <FaPaperPlane />
              </Button>
            </Form>
          </Card.Footer>
        </Card>
      </Container>

      <style>{`
        .chat-card {
          height: calc(100vh - 150px);
          display: flex;
          flex-direction: column;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .chat-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 15px 20px;
        }

        .chat-header h6 { color: white; }
        .chat-header small { color: rgba(255,255,255,0.8); }
        .chat-header .btn-link { color: white; font-size: 16px; }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-date-divider {
          text-align: center;
          margin: 15px 0;
        }

        .chat-date-divider span {
          background: #e2e8f0;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          color: #64748b;
        }

        .chat-bubble {
          max-width: 70%;
          padding: 10px 15px;
          border-radius: 15px;
          position: relative;
        }

        .chat-bubble.mine {
          align-self: flex-end;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-bubble.theirs {
          align-self: flex-start;
          background: white;
          color: #1e293b;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .chat-bubble.typing {
          font-style: italic;
          color: #94a3b8;
        }

        .chat-time {
          font-size: 10px;
          opacity: 0.7;
          display: block;
          text-align: right;
          margin-top: 4px;
        }

        .chat-input-area {
          padding: 15px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }

        .chat-input-area .form-control {
          border-radius: 25px;
          padding: 10px 20px;
        }

        .chat-input-area .btn {
          border-radius: 50%;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Dark Mode */
        body.dark-mode .chat-card {
          background-color: #16213e !important;
          border-color: #374151 !important;
        }
        body.dark-mode .chat-messages {
          background: #1a1a2e !important;
        }
        body.dark-mode .chat-date-divider span {
          background: #334155 !important;
          color: #94a3b8 !important;
        }
        body.dark-mode .chat-bubble.theirs {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
        }
        body.dark-mode .chat-input-area {
          background: #16213e !important;
          border-top-color: #374151 !important;
        }
        body.dark-mode .chat-input-area .form-control {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #374151 !important;
        }
      `}</style>
    </>
  );
}
