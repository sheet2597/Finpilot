import { api } from "@/lib/axios";

function buildFormData(values) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => {
    if (key === "logo") {
      const fileList = value;
      if (fileList && fileList.length > 0) formData.append("logo", fileList[0]);
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  return formData;
}

export const companiesApi = {
  list: (params) => api.get("/companies", { params }),

  create: (values) =>
    api.post("/companies", buildFormData(values), {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  detail: (id) => api.get(`/companies/${id}`),

  update: (id, values) =>
    api.put(`/companies/${id}`, buildFormData(values), {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  remove: (id) => api.delete(`/companies/${id}`),
};
