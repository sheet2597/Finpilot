import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { systemApi } from "./api";

export function useUserPreferences() {
  return useQuery(["user-preferences"], () =>
    systemApi.getUserPreferences().then((r) => r.data.data)
  );
}

export function useUpdateUserPreferences() {
  const qc = useQueryClient();
  return useMutation((data) => systemApi.updateUserPreferences(data), {
    onSuccess: () => {
      qc.invalidateQueries(["user-preferences"]);
      toast.success("Preferences updated.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not update preferences."));
    },
  });
}
