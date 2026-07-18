import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { AgentsPage } from './pages/AgentsPage'
import { ConversationDetailPage } from './pages/ConversationDetailPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { ImportNewPage } from './pages/ImportNewPage'
import { ImportProgressPage } from './pages/ImportProgressPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProviderPage } from './pages/ProviderPage'
import { ReportingSettingsPage } from './pages/ReportingSettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/settings/provider" element={<ProviderPage />} />
          <Route path="/settings/agents" element={<AgentsPage />} />
          <Route path="/settings/reporting" element={<ReportingSettingsPage />} />
          <Route path="/imports/new" element={<ImportNewPage />} />
          <Route path="/imports/:importJobId" element={<ImportProgressPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/conversations/:conversationId" element={<ConversationDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
