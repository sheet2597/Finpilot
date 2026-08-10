import { api } from "@/lib/axios";

export const dashboardApi = {
  summary: (params) =>
    api.get("/dashboard/summary", { params }),
};
