import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import PublicTemplates from "./pages/PublicTemplates";
import NewTemplate from "./pages/NewTemplate";
import TemplateDetail from "./pages/TemplateDetail";
import FileEditor from "./pages/FileEditor";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Schedules from "./pages/Schedules";
import Devices from "./pages/Devices";
import Apps from "./pages/Apps";
import AppDetail from "./pages/AppDetail";
import AuditLogs from "./pages/AuditLogs";
import Organizations from "./pages/Organizations";
import FleetRuns from "./pages/FleetRuns";
import FleetRunDetail from "./pages/FleetRunDetail";
import Login from "./pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/public" element={<PublicTemplates />} />
          <Route path="/templates/new" element={<NewTemplate />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
          <Route path="/templates/:id/files/:fileName" element={<FileEditor />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/apps/:id" element={<AppDetail />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/fleet-runs" element={<FleetRuns />} />
          <Route path="/fleet-runs/:id" element={<FleetRunDetail />} />
          <Route path="/login" element={<Login />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
