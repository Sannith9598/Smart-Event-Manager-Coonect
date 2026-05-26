import { Navigate } from "react-router-dom";

// Checks if the JWT is expired by decoding the payload and comparing exp to current time
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Check if token expires in less than 30 seconds
    return payload.exp * 1000 < Date.now() + 30000;
  } catch {
    return true;
  }
};

// Wraps routes that require authentication — redirects to login if no valid token or wrong role
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user || isTokenExpired(token)) {
    // Clear stale data if token is expired
    if (token && isTokenExpired(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
