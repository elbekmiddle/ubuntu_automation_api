import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import NewTemplate from "./pages/NewTemplate";
import TemplateDetail from "./pages/TemplateDetail";
import FileEditor from "./pages/FileEditor";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Schedules from "./pages/Schedules";
import Devices from "./pages/Devices";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/new" element={<NewTemplate />} />
        <Route path="/templates/:id" element={<TemplateDetail />} />
        <Route path="/templates/:id/files/:fileName" element={<FileEditor />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}
