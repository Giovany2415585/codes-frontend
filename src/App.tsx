import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Codes from "./pages/Codes";
import AuthorizedEmails from "./pages/AuthorizedEmails";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import Users from "./pages/Users";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1e293b",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "14px 18px",
              borderRadius: "12px",
            },
          }}
        />

        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/home" />} />

            <Route path="home" element={<Home />} />
            <Route path="codes" element={<Codes />} />
            <Route path="authorizedEmails" element={<AuthorizedEmails />} />
            <Route path="/users" element={<Users />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>

      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;