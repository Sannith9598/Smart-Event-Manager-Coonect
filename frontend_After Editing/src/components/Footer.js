import { useState } from "react";
import {
  Container,
  Row,
  Col,
  Button
} from "react-bootstrap";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCopyright
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";


export default function Footer() {
  const { darkMode } = useTheme();

  const [adminContact, setAdminContact] = useState({
    name: "Admin",
    email: "sannithsanni2005@gmail.com",
    phone: "+91 7892119598",
    address: "India",
  });

   

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer className={`footer-section ${darkMode ? 'footer-dark' : 'footer-light'}`}>
        <Container>
          <Row className="g-4">
            <Col md={4}>
              <div className="footer-widget">
                <h4 className="footer-logo">🎉 EVENTHUB</h4>
                <p className="footer-description">
                  Your one-stop platform for finding the perfect event planners 
                  and making your special moments unforgettable. We connect you 
                  with verified professionals for weddings, birthdays, corporate 
                  events, and more.
                </p>
                <div className="social-links">
                  <a href="#" className="social-link" aria-label="Facebook">
                    <FaFacebook />
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <FaTwitter />
                  </a>
                  <a href="#" className="social-link" aria-label="Instagram">
                    <FaInstagram />
                  </a>
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <FaLinkedin />
                  </a>
                </div>
              </div>
            </Col>

            <Col md={2}>
              <div className="footer-widget">
                <h5>Quick Links</h5>
                <ul className="footer-links">
                  <li><a href="/">Home</a></li>
                  <li><a href="/">Events</a></li>
                  <li><a href="/">About Us</a></li>
                  <li><a href="/">Contact</a></li>
                  <li><a href="/">Privacy Policy</a></li>
                  <li><a href="/">Terms & Conditions</a></li>
                </ul>
              </div>
            </Col>

            <Col md={3}>
              <div className="footer-widget">
                <h5>Contact Admin</h5>
                <div className="contact-info-footer">
                  <p>
                    <FaEnvelope className="contact-icon" />
                    <a href={`mailto:${adminContact.email}`}>{adminContact.email}</a>
                  </p>
                  <p>
                    <FaPhone className="contact-icon" />
                    <a href={`tel:${adminContact.phone}`}>{adminContact.phone}</a>
                  </p>
                  <p>
                    <FaMapMarkerAlt className="contact-icon" />
                    {adminContact.address}
                  </p>
                </div>
              </div>
            </Col>

            <Col md={3}>
              <div className="footer-widget">
                <h5>Support & Help</h5>
                <p className="support-text">
                  Need assistance? Our support team is here to help you 24/7.
                </p>
                <Button 
                  variant="outline-light" 
                  className="support-btn"
                  onClick={() => window.location.href = "/"}
                >
                  Get Support
                </Button>
              </div>
            </Col>
          </Row>

          <div className="copyright-bar">
            <p>
              <FaCopyright className="copyright-icon" />
              {currentYear} EVENTHUB. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>


      <style>{`
        .footer-section {
          padding: 60px 0 20px;
          margin-top: 60px;
          position: relative;
          transition: all 0.5s ease;
        }

        /* Dark theme footer */
        .footer-dark {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
        }

        .footer-dark::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
        }

        /* Light theme footer */
        .footer-light {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          color: #334155;
          border-top: 1px solid rgba(99, 102, 241, 0.1);
        }

        .footer-light::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
        }

        .footer-logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .footer-description {
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .footer-dark .footer-description { color: #cbd5e1; }
        .footer-light .footer-description { color: #64748b; }

        .social-links {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: all 0.3s ease;
          font-size: 18px;
        }

        .footer-dark .social-link {
          background: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }

        .footer-light .social-link {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
        }

        .social-link:hover {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transform: translateY(-3px);
          color: white;
        }

        .footer-widget h5 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          position: relative;
          padding-bottom: 10px;
        }

        .footer-dark .footer-widget h5 { color: #e2e8f0; }
        .footer-light .footer-widget h5 { color: #1e293b; }

        .footer-widget h5::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links li {
          margin-bottom: 12px;
        }

        .footer-links a {
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .footer-dark .footer-links a { color: #cbd5e1; }
        .footer-light .footer-links a { color: #64748b; }

        .footer-links a:hover {
          color: #8b5cf6;
          padding-left: 5px;
        }

        .contact-info-footer p {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }

        .footer-dark .contact-info-footer p { color: #cbd5e1; }
        .footer-light .contact-info-footer p { color: #64748b; }

        .contact-icon {
          color: #8b5cf6;
          font-size: 16px;
          min-width: 20px;
        }

        .contact-info-footer a {
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-dark .contact-info-footer a { color: #cbd5e1; }
        .footer-light .contact-info-footer a { color: #64748b; }

        .contact-info-footer a:hover {
          color: #8b5cf6;
        }

        .feedback-btn {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          padding: 8px 20px;
          border-radius: 25px;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .feedback-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(99, 102, 241, 0.4);
        }

        .support-text {
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .footer-dark .support-text { color: #cbd5e1; }
        .footer-light .support-text { color: #64748b; }

        .support-btn {
          border-radius: 25px;
          padding: 8px 25px;
          transition: all 0.3s ease;
        }

        .footer-dark .support-btn {
          border-color: rgba(255, 255, 255, 0.3);
          color: #e2e8f0;
        }

        .footer-light .support-btn {
          border-color: rgba(99, 102, 241, 0.4);
          color: #6366f1;
        }

        .support-btn:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .copyright-bar {
          margin-top: 50px;
          padding-top: 20px;
          text-align: center;
        }

        .footer-dark .copyright-bar {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-light .copyright-bar {
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }

        .copyright-bar p {
          margin: 0;
          font-size: 14px;
        }

        .footer-dark .copyright-bar p { color: #94a3b8; }
        .footer-light .copyright-bar p { color: #64748b; }

        .copyright-icon {
          margin-right: 5px;
          font-size: 12px;
        }

        /* Feedback Modal Styles */
        .feedback-modal .modal-content {
          border-radius: 20px;
          overflow: hidden;
        }

        .feedback-modal .modal-header {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
        }

        .feedback-modal .modal-header .btn-close {
          background-color: white;
          opacity: 0.8;
        }

        .feedback-rating {
          display: flex;
          gap: 10px;
          cursor: pointer;
        }

        .rating-star {
          font-size: 32px;
          color: #cbd5e1;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .rating-star:hover,
        .rating-star.active {
          color: #fbbf24;
          transform: scale(1.1);
        }

        .feedback-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .footer-section {
            padding: 40px 0 20px;
          }

          .footer-widget {
            text-align: center;
          }

          .footer-widget h5::after {
            left: 50%;
            transform: translateX(-50%);
          }

          .social-links {
            justify-content: center;
          }

          .contact-info-footer p {
            justify-content: center;
          }

          .feedback-actions {
            flex-direction: column;
          }

          .feedback-actions button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}