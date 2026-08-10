import { api } from "@/lib/axios";

export const systemApi = {
  getUserPreferences: () => api.get("/system/settings/user/"),
  updateUserPreferences: (data) => api.patch("/system/settings/user/", data),
  getCompanySettings: (companyId) => api.get(`/system/settings/company/${companyId}/`),
  updateCompanySettings: (companyId, data) =>
    api.patch(`/system/settings/company/${companyId}/`, data),
};
