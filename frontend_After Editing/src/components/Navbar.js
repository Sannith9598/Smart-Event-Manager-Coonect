import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaShieldAlt, FaMoon, FaSun, FaHeart, FaChartLine, FaEnvelope } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../context/ThemeContext";
import { useState, useEffect } from "react";
import NotificationBell from "./NotificationBell";
import API from "../services/api";

export default function AppNavbar() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [unreadMessages, setUnreadMessages] = useState(0);

  let user = null;
  try {
    const data = localStorage.getItem("user");
    user = data ? JSON.parse(data) : null;
  } catch {
    user = null;
  }

  useEffect(() => {
    if (user && (user.role === "customer" || user.role === "manager")) {
      fetchUnreadMessages();
      // Poll every 60 seconds for unread messages (fallback for socket issues)
      const interval = setInterval(fetchUnreadMessages, 60000);
      return () => clearInterval(interval);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUnreadMessages = async () => {
    try {
      const res = await API.get("/messages/unread-count");
      setUnreadMessages(res.data.count || 0);
    } catch (err) {
      // Silently fail
    }
  };

  const logout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/");
    toast.success("Logout successfully");
  };

  return (
    <>
      <Navbar expand="lg" className="nav-clean">
        <Container>
          <Navbar.Brand as={Link} to="/" className="brand">
            Smart Event Manager Connect
          </Navbar.Brand>

          <Navbar.Toggle />

          <Navbar.Collapse className="justify-content-end">
            <Nav className="align-items-center gap-3">
              <Nav.Link as={Link} to="/">
                Home
              </Nav.Link>

              {user?.role === "admin" && (
                <Nav.Link as={Link} to="/admin-dashboard">
                  <FaShieldAlt className="me-1" /> Admin Panel
                </Nav.Link>
              )}

              {user?.role === "customer" && (
                <>
                  <Nav.Link as={Link} to="/customer-dashboard">
                    Dashboard
                  </Nav.Link>
                  <Nav.Link as={Link} to="/customer/favorites">
                    <FaHeart className="me-1" /> Wishlist
                  </Nav.Link>
                </>
              )}

              {user?.role === "manager" && (
                <>
                  <Nav.Link as={Link} to="/manager-dashboard">
                    Manager Panel
                  </Nav.Link>
                  <Nav.Link as={Link} to="/manager/analytics">
                    <FaChartLine className="me-1" /> Analytics
                  </Nav.Link>
                </>
              )}

              <Button
                className="btn-theme-toggle"
                onClick={toggleDarkMode}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <FaSun /> : <FaMoon />}
              </Button>

              {user ? (
                <>
                  {(user.role === "customer" || user.role === "manager") && (
                    <div className="messages-badge-wrapper">
                      <Nav.Link as={Link} to={user.role === "customer" ? "/customer/bookings" : "/manager-dashboard"} className="messages-link">
                        <FaEnvelope />
                        {unreadMessages > 0 && (
                          <span className="messages-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                        )}
                      </Nav.Link>
                    </div>
                  )}
                  <NotificationBell />
                  <Nav.Link as={Link} to="/profile">
                    Profile
                  </Nav.Link>
                  <span className="user">
                    <FaUserCircle /> {user.name}
                    {user.role === "admin" && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </span>

                  <Button className="btn-logout" onClick={logout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  className="btn-login"
                >
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <style>{`
        .nav-clean {
          position: sticky;
          top: 0;
          z-index: 1030;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          box-shadow: 0 4px 30px rgba(0,0,0,0.15);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 0;
        }

        .brand {
          font-weight: 700;
          color: #fff !important;
          font-size: 20px;
        }

        .nav-link {
          color: #e0e7ff !important;
          font-weight: 500;
          transition: 0.3s;
        }

        .nav-link:hover {
          color: #fff !important;
          transform: translateY(-1px);
        }

        .btn-login {
          background: #fff;
          color: #6366f1;
          border-radius: 20px;
          padding: 5px 15px;
          border: none;
          font-weight: 500;
        }

        .btn-login:hover {
          background: #e0e7ff;
        }

        .btn-logout {
          background: #ef4444;
          border-radius: 20px;
          padding: 5px 15px;
          border: none;
          font-weight: 500;
        }

        .btn-logout:hover {
          background: #dc2626;
        }

        .user {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fbbf24;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        .admin-badge {
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          margin-left: 5px;
        }

        .btn-theme-toggle {
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
          transition: 0.3s;
          padding: 0;
        }

        .btn-theme-toggle:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: rotate(20deg);
        }

        .messages-badge-wrapper {
          position: relative;
        }

        .messages-link {
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex !important;
          align-items: center;
          justify-content: center;
          color: #fff !important;
          font-size: 16px;
          transition: 0.3s;
          padding: 0 !important;
          position: relative;
        }

        .messages-link:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .messages-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #3b82f6;
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
      `}</style>
    </>
  );
}