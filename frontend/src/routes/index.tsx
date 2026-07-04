import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../pages/Login/Login';
import { AppShell, RequireAdmin } from '../layout/AppShell';
import { PartnerShell } from '../layout/PartnerShell';
import { ExceptionQueue } from '../pages/ExceptionQueue/ExceptionQueue';
import { MyActions } from '../pages/MyActions/MyActions';
import { ExecutiveView } from '../pages/ExecutiveView/ExecutiveView';
import { PartnerNetwork } from '../pages/PartnerNetwork/PartnerNetwork';
import { Rules } from '../pages/Rules/Rules';
import { Teams } from '../pages/Teams/Teams';
import { Integrations } from '../pages/Integrations/Integrations';
import { Users } from '../pages/Users/Users';
import { Settings } from '../pages/Settings/Settings';
import { AuditLog } from '../pages/AuditLog/AuditLog';
import { PartnerQueue } from '../pages/PartnerPortal/PartnerQueue';
import { PartnerMessages } from '../pages/PartnerPortal/PartnerMessages';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route path="/exceptions" element={<ExceptionQueue />} />
        <Route path="/actions" element={<MyActions />} />
        <Route path="/executive" element={<ExecutiveView />} />
        <Route path="/partners" element={<PartnerNetwork />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/teams" element={<Teams />} />

        <Route element={<RequireAdmin />}>
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit-log" element={<AuditLog />} />
        </Route>
      </Route>

      <Route element={<PartnerShell />}>
        <Route path="/partner/queue" element={<PartnerQueue />} />
        <Route path="/partner/messages" element={<PartnerMessages />} />
      </Route>

      <Route path="/" element={<Navigate to="/exceptions" replace />} />
      <Route path="*" element={<Navigate to="/exceptions" replace />} />
    </Routes>
  );
}
