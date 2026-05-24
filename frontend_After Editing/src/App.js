import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { lazy, Suspense } from "react";
import { Spinner, Container } from "react-bootstrap";
import Home from "./pages/Home";
import Login from "./pages/Login";
import "./App.css";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages for code splitting
const Profile = lazy(() => import("./pages/Profile"));
const ManagerDashboard = lazy(() => import("./pages/Event Manager/ManagerDashboard"));
const CustomerDashboard = lazy(() => import("./pages/Customer/CustomerDashboard"));
const AdminDashboard = lazy(() => import("./pages/Admin/AdminDashboard"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Bookings = lazy(() => import("./pages/Customer/Bookings"));
const Favorites = lazy(() => import("./pages/Customer/Favorites"));
const Analytics = lazy(() => import("./pages/Event Manager/Analytics"));
const Chat = lazy(() => import("./pages/Chat"));
const PublicProfile = lazy(() => import("./pages/PublicProfile/PublicProfile"));

const PageLoader = () => (
  <Container className="text-center py-5">
    <Spinner animation="border" variant="primary" />
    <p className="mt-3 text-muted">Loading...</p>
  </Container>
);


export const baseurl = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

function App() {
  return (
    <BrowserRouter>

      <ToastContainer />

      {/* Routes */}
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/manager/:managerId/profile" element={<PublicProfile />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/profile" element={
          <ProtectedRoute allowedRoles={["customer", "manager", "admin"]}>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/booking/:bookingId/chat" element={
          <ProtectedRoute allowedRoles={["customer", "manager"]}>
            <Chat />
          </ProtectedRoute>
        } />

        <Route path="/customer-dashboard" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/customer/bookings" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <Bookings />
          </ProtectedRoute>
        } />
        <Route path="/customer/favorites" element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <Favorites />
          </ProtectedRoute>
        } />

        <Route path="/manager-dashboard" element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/manager/analytics" element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <Analytics />
          </ProtectedRoute>
        } />

        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

    </BrowserRouter>
  );
}

export default App;
