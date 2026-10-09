import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

// Pages
import { Login } from './pages/Login'
import { Activate } from './pages/Activate'
import { ForgotPassword } from './pages/ForgotPassword'
import { Dashboard } from './pages/Dashboard'
import { Businesses } from './pages/Businesses'
import { BusinessDetail } from './pages/BusinessDetail'
import { Managers } from './pages/Managers'
import { Employees } from './pages/Employees'
import { Attendance } from './pages/Attendance'
import { Leaves } from './pages/Leaves'
import { Salary } from './pages/Salary'
import { Settings } from './pages/Settings'
import { Profile } from './pages/Profile'
import { Plans } from './pages/superadmin/Plans'
import { Brokers } from './pages/superadmin/Brokers'
import { BrokerDashboard } from './pages/broker/BrokerDashboard'
import { Referrals } from './pages/broker/Referrals'
import { Commissions } from './pages/broker/Commissions'
import { ManagerAccessControl } from './pages/ManagerAccessControl'
import { Holidays } from './pages/Holidays'
import { PayrollRuns } from './pages/PayrollRuns'
import { ThemeAudit } from './pages/ThemeAudit'
import { Meetings } from './pages/Meetings'

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<Activate />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* SuperAdmin Routes */}
            <Route
              path="/theme-audit"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <ThemeAudit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/businesses"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Businesses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/businesses/:id"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <BusinessDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plans"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Plans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brokers"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <Brokers />
                </ProtectedRoute>
              }
            />

            {/* Broker Routes */}
            <Route
              path="/broker/dashboard"
              element={
                <ProtectedRoute allowedRoles={['BROKER']}>
                  <BrokerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/broker/referrals"
              element={
                <ProtectedRoute allowedRoles={['BROKER']}>
                  <Referrals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/broker/commissions"
              element={
                <ProtectedRoute allowedRoles={['BROKER']}>
                  <Commissions />
                </ProtectedRoute>
              }
            />

            {/* Business Admin Routes */}
            <Route
              path="/managers"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <Managers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Manager Routes */}
            <Route
              path="/my-staff"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <Employees isStaffOnlyView={true} />
                </ProtectedRoute>
              }
            />

            {/* Team & Access */}
            <Route
              path="/team-access"
              element={<Navigate to="/managers" replace />}
            />

            {/* Attendance Policies */}
            <Route path="/attendance/policies" element={<Navigate to="/attendance?tab=policy" replace />} />

            {/* Manager Access Control */}
            <Route
              path="/managers/access-control"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <ManagerAccessControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/managers/:id/access-control"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <ManagerAccessControl />
                </ProtectedRoute>
              }
            />

            {/* Holidays Calendar */}
            <Route path="/holidays" element={<Holidays />} />

            {/* Payroll Runs */}
            <Route
              path="/payroll/runs"
              element={
                <ProtectedRoute allowedRoles={['BUSINESS_ADMIN', 'SUPERADMIN']}>
                  <PayrollRuns />
                </ProtectedRoute>
              }
            />

            {/* Common Operational Routes */}
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/salary" element={<Salary />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}
