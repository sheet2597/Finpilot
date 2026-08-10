import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { mlApi } from "./api";

export function useModelStatus() {
  return useQuery(["ml-model-status"], () => mlApi.modelStatus().then((r) => r.data.data));
}

export function useModelReadiness(companyId) {
  return useQuery(
    ["ml-model-readiness", companyId], 
    () => mlApi.modelReadiness(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useTrainAllModels() {
  const queryClient = useQueryClient();
  return useMutation(() => mlApi.trainAll(), {
    onSuccess: () => {
      toast.success("Training completed for all models.");
      queryClient.invalidateQueries(["ml-model-status"]);
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Training failed.")); },
  });
}

export function useTrainSingleModel() {
  const queryClient = useQueryClient();
  return useMutation(({ modelType, companyId }) => mlApi.trainSingle(modelType, companyId), {
    onSuccess: (_res, { modelType }) => {
      toast.success(`'${modelType}' trained successfully.`);
      queryClient.invalidateQueries(["ml-model-status"]);
    },
    onError: (error) => {
      // Show better error messages if API returns structured errors
      let errMsg = "Training failed — check the model has enough data.";
      const errCode = error.response?.data?.error_code;
      if (errCode === "INSUFFICIENT_TRAINING_DATA" || errCode === "INSUFFICIENT_SAMPLES") {
        const { available_samples, required_samples, recommendation } = error.response.data;
        errMsg = `Not enough data: ${available_samples} available, ${required_samples} required. ${recommendation?.[0] || ""}`;
      } else if (errCode === "INSUFFICIENT_CLASS_DIVERSITY") {
        const { available_samples, required_samples, unique_classes, recommendation } = error.response.data;
        errMsg = `Insufficient class diversity: ${unique_classes} unique classes found, minimum 2 required. ${recommendation?.[0] || ""}`;
      } else {
        errMsg = getApiErrorMessage(error, errMsg);
      }
      toast.error(errMsg, { duration: 6000 });
    },
  });
}

export function useTrainDemoModel() {
  const queryClient = useQueryClient();
  return useMutation(({ modelType, companyId }) => mlApi.trainDemo(modelType, companyId), {
    onSuccess: (_res, { modelType }) => {
      toast.success(`Demo model for '${modelType}' trained successfully.`);
      queryClient.invalidateQueries(["ml-model-status"]);
    },
    onError: (error) => {
      let errMsg = "Demo training failed.";
      const errCode = error.response?.data?.error_code;
      if (errCode === "INSUFFICIENT_TRAINING_DATA" || errCode === "INSUFFICIENT_SAMPLES") {
        const { available_samples, required_samples } = error.response.data;
        errMsg = `Not enough data: ${available_samples} available, ${required_samples} required.`;
      } else if (errCode === "INSUFFICIENT_CLASS_DIVERSITY") {
        const { unique_classes } = error.response.data;
        errMsg = `Insufficient class diversity: ${unique_classes} unique classes found, minimum 2 required.`;
      } else {
        errMsg = getApiErrorMessage(error, errMsg);
      }
      toast.error(errMsg, { duration: 6000 });
    },
  });
}

export function useDuplicateTransactions(companyId) {
  return useQuery(
    ["ml-duplicate-transactions", companyId],
    () => mlApi.duplicateTransactions(companyId).then((r) => r.data.data),
    { retry: false, enabled: !!companyId }
  );
}

export function useComplianceRisk(companyId) {
  return useQuery(
    ["ml-compliance-risk", companyId],
    () => mlApi.complianceRisk(companyId).then((r) => r.data.data),
    { retry: false, enabled: !!companyId }
  );
}

export function useTaxForecast(periodsAhead = 3) {
  return useQuery(
    ["ml-tax-forecast", periodsAhead],
    () => mlApi.forecastTax(periodsAhead).then((r) => r.data.data),
    { retry: false }
  );
}

export function useExpenseForecast(periodsAhead = 3) {
  return useQuery(
    ["ml-expense-forecast", periodsAhead],
    () => mlApi.forecastExpenses(periodsAhead).then((r) => r.data.data),
    { retry: false }
  );
}

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadMLReport(reportType, format, companyId) {
  try {
    const response = await mlApi.downloadReport(reportType, format, companyId);
    downloadBlob(response.data, `${reportType}-report.${format}`);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not download the report."));
  }
}
