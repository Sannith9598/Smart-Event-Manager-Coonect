import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import API from './services/api';

/**
 * Lightweight markdown renderer for bot messages.
 * Supports: **bold**, - bullet lists, 1. numbered lists, ## headings.
 * Unsupported tokens are displayed as raw text (graceful degradation).
 */
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading: ## text
    if (/^##\s+(.+)/.test(line)) {
      const match = line.match(/^##\s+(.+)/);
      elements.push(
        <h2 key={`h-${i}`} className="md-heading">{renderInline(match[1])}</h2>
      );
      i++;
      continue;
    }

    // Unordered list: consecutive lines starting with "- "
    if (/^-\s+(.+)/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^-\s+(.+)/.test(lines[i])) {
        const match = lines[i].match(/^-\s+(.+)/);
        listItems.push(
          <li key={`ul-${i}`}>{renderInline(match[1])}</li>
        );
        i++;
      }
      elements.push(<ul key={`ul-group-${i}`} className="md-list">{listItems}</ul>);
      continue;
    }

    // Ordered list: consecutive lines starting with "number. "
    if (/^\d+\.\s+(.+)/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s+(.+)/.test(lines[i])) {
        const match = lines[i].match(/^\d+\.\s+(.+)/);
        listItems.push(
          <li key={`ol-${i}`}>{renderInline(match[1])}</li>
        );
        i++;
      }
      elements.push(<ol key={`ol-group-${i}`} className="md-list">{listItems}</ol>);
      continue;
    }

    // Bullet lines using • character (common in the welcome message)
    if (/^[•]\s*(.+)/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[•]\s*(.+)/.test(lines[i])) {
        const match = lines[i].match(/^[•]\s*(.+)/);
        listItems.push(
          <li key={`bul-${i}`}>{renderInline(match[1])}</li>
        );
        i++;
      }
      elements.push(<ul key={`bul-group-${i}`} className="md-list">{listItems}</ul>);
      continue;
    }

    // Regular paragraph line
    elements.push(
      <p key={`p-${i}`}>{renderInline(line)}</p>
    );
    i++;
  }

  return elements;
}

/**
 * Renders inline markdown (bold) within a line of text.
 * Converts **text** to <strong>text</strong>.
 * Returns a mix of strings and React elements.
 */
function renderInline(text) {
  if (!text) return text;

  const parts = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before the bold
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Bold text
    parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last bold
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Floating chatbot widget that provides AI-powered event planning advice
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          type: "bot",
          text: "🎉 Welcome to Event Planning Assistant!\n\nI can help you with:\n\n• 📝 Event planning tips and advice\n• 💰 Budget recommendations\n• ✅ Planning checklists\n• 📅 Best practices for different events\n• 🎯 Answering event-related questions\n• 👥 Guest management advice\n• 🏢 Venue selection tips\n• 🤖 AI-powered recommendations based on real planners\n\nWhat would you like to know about event planning?"
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Sends the user's message to the chatbot API and displays the response
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: "user", text: userMessage }]);
    setInput("");
    setIsTyping(true);
    
    const trimmedHistory = conversationHistory.slice(-20);
    
    try {
      const response = await API.post("/chatbot/chat", {
        message: userMessage,
        history: trimmedHistory
      });
      
      const aiReply = response.data.reply;
      const suggestions = response.data.suggestions || [];
      setMessages(prev => [...prev, { type: "bot", text: aiReply, suggestions }]);
      setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }, { role: 'bot', content: aiReply }]);
    } catch (error) {
      console.error("Error calling chatbot API:", error);
      setMessages(prev => [...prev, { 
        type: "bot", 
        text: "Sorry, I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Triggers send when the user presses Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Handles clicking a suggested follow-up question chip
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    // Auto-send the suggestion
    setMessages(prev => [...prev, { type: "user", text: suggestion }]);
    setIsTyping(true);
    
    const trimmedHistory = conversationHistory.slice(-20);
    
    API.post("/chatbot/chat", { message: suggestion, history: trimmedHistory })
      .then((response) => {
        const aiReply = response.data.reply;
        const suggestions = response.data.suggestions || [];
        setMessages(prev => [...prev, { type: "bot", text: aiReply, suggestions }]);
        setConversationHistory(prev => [...prev, { role: 'user', content: suggestion }, { role: 'bot', content: aiReply }]);
      })
      .catch(() => {
        setMessages(prev => [...prev, { type: "bot", text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
      })
      .finally(() => {
        setIsTyping(false);
        setInput("");
      });
  };

  return (
    <>
      <motion.button
        className="chatbot-button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open event planning chatbot"
      >
        💬
      </motion.button>

      {isOpen && (
        <motion.div
          className="chatbot-window"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-avatar">🎉</span>
              <div>
                <h3>Event Planning Assistant</h3>
                <p>AI-Powered Expert Advice</p>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                <div className="message-content">
                  {msg.type === "bot" && <span className="message-icon">🎯</span>}
                  <div className="message-text">
                    {msg.type === "bot" ? renderMarkdown(msg.text) : msg.text.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="suggestion-chips">
                        {msg.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            className="suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.type === "user" && <span className="message-icon">👤</span>}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <div className="message-content">
                  <span className="message-icon">🎯</span>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chatbot-input">
            <div className="chatbot-input-wrapper">
              <input
                type="text"
                placeholder="Ask about event planning, tips, budgets..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1500}
              />
              <span className={`char-counter${input.length > 1400 ? ' char-counter-warn' : ''}`}>
                {input.length}/1500
              </span>
            </div>
            <button onClick={handleSend}>
              Send
            </button>
          </div>
        </motion.div>
      )}

      <style>{`
        .chatbot-button {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(99,102,241,0.4);
          z-index: 1000;
          transition: all 0.3s ease;
        }

        .chatbot-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(99,102,241,0.6);
        }

        .chatbot-window {
          position: fixed;
          bottom: 100px;
          right: 30px;
          width: 400px;
          height: 500px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chatbot-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chatbot-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chatbot-avatar {
          font-size: 32px;
        }

        .chatbot-header-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .chatbot-header-info p {
          margin: 0;
          font-size: 12px;
          opacity: 0.9;
        }

        .chatbot-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
          transition: transform 0.3s ease;
        }

        .chatbot-close:hover {
          transform: scale(1.1);
        }

        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f9fafb;
        }

        .chatbot-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chatbot-messages::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .chatbot-messages::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }

        .message {
          margin-bottom: 15px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-content {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .message.user .message-content {
          flex-direction: row-reverse;
        }

        .message-icon {
          font-size: 24px;
          min-width: 30px;
        }

        .message-text {
          background: white;
          padding: 10px 15px;
          border-radius: 15px;
          max-width: 80%;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .message-text p {
          margin: 5px 0;
          line-height: 1.4;
          font-size: 14px;
          color: #374151;
        }

        .message-text .md-heading {
          margin: 10px 0 6px 0;
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.3;
        }

        .message-text .md-list {
          margin: 6px 0;
          padding-left: 20px;
        }

        .message-text .md-list li {
          margin: 3px 0;
          line-height: 1.4;
          font-size: 14px;
          color: #374151;
        }

        .message-text ol.md-list {
          list-style-type: decimal;
        }

        .message-text ul.md-list {
          list-style-type: disc;
        }

        .message-text strong {
          font-weight: 700;
          color: #111827;
        }

        .message.user .message-text {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }

        .message.user .message-text p {
          color: white;
        }

        .typing-indicator {
          display: flex;
          gap: 5px;
          padding: 10px 15px;
          background: white;
          border-radius: 15px;
          width: 60px;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6366f1;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .chatbot-input {
          padding: 15px;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 10px;
        }

        .chatbot-input-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .chatbot-input input {
          width: 100%;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .chatbot-input input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
        }

        .char-counter {
          font-size: 11px;
          color: #9ca3af;
          text-align: right;
          margin-top: 2px;
          padding-right: 4px;
        }

        .char-counter-warn {
          color: #ef4444;
        }

        .suggestion-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .suggestion-chip {
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          border-radius: 16px;
          padding: 5px 12px;
          font-size: 12px;
          color: #4338ca;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .suggestion-chip:hover {
          background: #6366f1;
          color: white;
          border-color: #6366f1;
          transform: translateY(-1px);
        }

        .chatbot-input button {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .chatbot-input button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(99,102,241,0.3);
        }

        @media (max-width: 768px) {
          .chatbot-window {
            width: 90%;
            right: 5%;
            left: 5%;
            bottom: 80px;
            height: 500px;
          }
          
          .chatbot-button {
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            font-size: 24px;
          }
        }

        /* Dark Mode */
        body.dark-mode .chatbot-window {
          background: #16213e;
        }
        body.dark-mode .chatbot-messages {
          background: #1a1a2e;
        }
        body.dark-mode .chatbot-messages::-webkit-scrollbar-track {
          background: #1e293b;
        }
        body.dark-mode .chatbot-messages::-webkit-scrollbar-thumb {
          background: #475569;
        }
        body.dark-mode .message-text {
          background: #1e293b;
          color: #e2e8f0;
        }
        body.dark-mode .message-text p {
          color: #e2e8f0;
        }
        body.dark-mode .message-text .md-heading {
          color: #f1f5f9;
        }
        body.dark-mode .message-text .md-list li {
          color: #e2e8f0;
        }
        body.dark-mode .message-text strong {
          color: #f8fafc;
        }
        body.dark-mode .message.user .message-text {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
        }
        body.dark-mode .message.user .message-text p {
          color: white;
        }
        body.dark-mode .typing-indicator {
          background: #1e293b;
        }
        body.dark-mode .chatbot-input {
          background: #16213e;
          border-top-color: #374151;
        }
        body.dark-mode .chatbot-input input {
          background: #1e293b;
          color: #e2e8f0;
          border-color: #374151;
        }
        body.dark-mode .chatbot-input input::placeholder {
          color: #64748b;
        }
        body.dark-mode .chatbot-input input:focus {
          border-color: #6366f1;
        }
        body.dark-mode .char-counter {
          color: #64748b;
        }
        body.dark-mode .char-counter-warn {
          color: #ef4444;
        }

        body.dark-mode .suggestion-chips {
          border-top-color: #374151;
        }

        body.dark-mode .suggestion-chip {
          background: #1e293b;
          border-color: #475569;
          color: #a5b4fc;
        }

        body.dark-mode .suggestion-chip:hover {
          background: #6366f1;
          color: white;
          border-color: #6366f1;
        }
      `}</style>
    </>
  );
};

export default Chatbot;