import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import KanbanBoard from './pages/KanbanBoard';
import MyTasks from './pages/MyTasks';
import CreateTicket from './pages/CreateTicket';
import TicketDetail from './pages/TicketDetail';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';
import Clients from './pages/Clients';
import ClientHistory from './pages/ClientHistory';
import OnboardingForm from './pages/OnboardingForm';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm',
          duration: 3000,
          style: { background: '#1F2937', color: '#F9FAFB' },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<OnboardingForm />} />
        <Route path="/onboarding/:slug" element={<OnboardingForm />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/my-tasks" replace />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/tickets" element={<KanbanBoard />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/spas/:id" element={<ClientHistory />} />
          <Route path="/create" element={<CreateTicket />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<AdminPanel />} />
        </Route>
        <Route path="*" element={<Navigate to="/my-tasks" replace />} />
      </Routes>
    </>
  );
}
