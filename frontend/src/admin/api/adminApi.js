import { apiRequest } from "../../shared/api/client";

export function getAdminDashboard() {
  return apiRequest("/api/admin/dashboard");
}

export function getAdminReports() {
  return apiRequest("/api/admin/reports");
}
