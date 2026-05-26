import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppNavbar from "../components/Navbar";

// 404 page shown when a route doesn't match any defined paths
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <AppNavbar />
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #f8faff 0%, #f0f4ff 50%, #faf5ff 100%)' }}>
        <Container className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              style={{ fontSize: "100px", marginBottom: "10px" }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🔍
            </motion.div>
            <h1 style={{ fontSize: "80px", fontWeight: "800", background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>404</h1>
            <h3 style={{ fontWeight: 700, color: '#1f2937', marginBottom: '12px' }}>Page Not Found</h3>
            <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto 30px', fontSize: '15px', lineHeight: '1.6' }}>
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <motion.button
                className="btn-pro btn-pro-complete"
                onClick={() => navigate("/")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ padding: '12px 28px', fontSize: '15px' }}
              >
                Go Home
              </motion.button>
              <motion.button
                className="btn-pro btn-pro-toggle"
                onClick={() => navigate(-1)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ padding: '12px 28px', fontSize: '15px' }}
              >
                Go Back
              </motion.button>
            </div>
          </motion.div>
        </Container>
      </div>
    </>
  );
}
