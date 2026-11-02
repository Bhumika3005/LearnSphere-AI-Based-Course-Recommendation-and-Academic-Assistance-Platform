import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login      from "./pages/Login.jsx";
import Signup     from "./pages/Signup.jsx";
import Dashboard  from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import StudyMaterials from "./pages/StudyMaterials.jsx";
import Progress from "./pages/Progress.jsx";
import Assessment from "./pages/Assessment.jsx";
import Certificate from "./pages/Certificate";
import VerifyCertificate from "./pages/VerifyCertificate.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"          element={<LandingPage />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/signup"    element={<Signup />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/study-materials" element={<PrivateRoute><StudyMaterials /></PrivateRoute>} />
            <Route path="/assessment" element={<PrivateRoute><Assessment /></PrivateRoute>} />
            <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
            <Route path="/certificate" element={<PrivateRoute><Certificate /></PrivateRoute>} /> 
            <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;