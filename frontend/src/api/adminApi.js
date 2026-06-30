import { apiRequest } from "./client";

export function getAdminDashboard() {
  return apiRequest("/api/admin/dashboard");
}

export function getAdminReports() {
  return apiRequest("/api/admin/reports");
}
