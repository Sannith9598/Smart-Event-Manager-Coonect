import { motion } from "framer-motion";
import { FaShieldAlt, FaCheckCircle, FaSearch, FaStar, FaArrowRight } from "react-icons/fa";

export default function UnverifiedAlert({ onVerify }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="unverified-container"
    >
      <div className="unverified-card">
        <div className="unverified-glow" />
        <div className="unverified-content">
          <div className="unverified-icon-wrap">
            <FaShieldAlt />
          </div>
          <div className="unverified-text">
            <h4>Complete Your Verification</h4>
            <p>Unlock the full potential of your event management business</p>
          </div>
        </div>

        <div className="unverified-benefits">
          <div className="benefit-item">
            <span className="benefit-icon"><FaCheckCircle /></span>
            <div>
              <strong>Trust Badge</strong>
              <small>Verified badge on your profile</small>
            </div>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon"><FaSearch /></span>
            <div>
              <strong>Search Visibility</strong>
              <small>Appear in customer search results</small>
            </div>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon"><FaStar /></span>
            <div>
              <strong>Priority Listing</strong>
              <small>Get featured above unverified planners</small>
            </div>
          </div>
        </div>

        <button className="verify-cta-btn" onClick={onVerify}>
          <span>Start Verification</span>
          <FaArrowRight />
        </button>
      </div>

      <style>{`
        .unverified-container {
          margin-bottom: 30px;
        }

        .unverified-card {
          position: relative;
          padding: 35px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          overflow: hidden;
        }

        .unverified-glow {
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        .unverified-content {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
          position: relative;
          z-index: 1;
        }

        .unverified-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }

        .unverified-text h4 {
          margin: 0 0 4px 0;
          font-weight: 700;
          font-size: 20px;
          color: #1f2937;
        }

        .unverified-text p {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
        }

        .unverified-benefits {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 25px;
          position: relative;
          z-index: 1;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(99, 102, 241, 0.1);
          transition: all 0.3s ease;
        }

        .benefit-item:hover {
          background: rgba(255, 255, 255, 0.95);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.1);
        }

        .benefit-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          flex-shrink: 0;
        }

        .benefit-item strong {
          display: block;
          font-size: 13px;
          color: #1f2937;
          margin-bottom: 1px;
        }

        .benefit-item small {
          color: #6b7280;
          font-size: 11px;
        }

        .verify-cta-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 32px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .verify-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        /* Dark Mode */
        body.dark-mode .unverified-card {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
          border-color: rgba(99, 102, 241, 0.25);
        }

        body.dark-mode .unverified-text h4 {
          color: #f1f5f9;
        }

        body.dark-mode .unverified-text p {
          color: #94a3b8;
        }

        body.dark-mode .benefit-item {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(99, 102, 241, 0.15);
        }

        body.dark-mode .benefit-item:hover {
          background: rgba(30, 41, 59, 1);
        }

        body.dark-mode .benefit-item strong {
          color: #e2e8f0;
        }

        body.dark-mode .benefit-item small {
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .unverified-card {
            padding: 25px;
          }
          .unverified-content {
            flex-direction: column;
            text-align: center;
          }
          .unverified-benefits {
            grid-template-columns: 1fr;
          }
          .verify-cta-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
}
