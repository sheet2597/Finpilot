"""ML views — exposes all machine learning predictions and model management
via REST endpoints.

Modules exposed:
  1. Expense Categorization (RandomForest)
  2. Duplicate Transaction Detection (IsolationForest)
  3. Compliance Risk Prediction (DecisionTree)
  4. Tax Liability Forecast (LinearRegression)
  5. Expense Forecast (LinearRegression)
"""
from django.http import HttpResponse
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from apps.accounts.permissions import RequireCompanyAccess
from rest_framework.response import Response
from rest_framework.views import APIView

from . import predict as pred
from . import services
from . import train
from . import utils as ml_utils
from .train import InsufficientDataError, InsufficientSamplesError, InsufficientClassDiversityError
from .predict import ModelNotTrainedError
from .serializers import (
    ApplyCategorizationSerializer, CategorizationPredictSerializer,
    ForecastQuerySerializer, ReportQuerySerializer,
)


def _company_id(request):
    return request.query_params.get("company_id") or None


def _wrap_prediction(fn, *args, default_return=None, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ModelNotTrainedError:
        return default_return if default_return is not None else []
    except InsufficientDataError as exc:
        raise ValidationError({"detail": str(exc)})


# ---------------------------------------------------------------------------
# Model management
# ---------------------------------------------------------------------------

class ModelStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ml_utils.list_model_registry(request.user.id)
        return Response({"success": True, "data": data})


class TrainAllModelsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        results = train.train_all(request.user)
        return Response({"success": True, "message": "Training completed.", "data": results})


class TrainSingleModelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, model_type):
        if model_type not in ml_utils.ALL_MODEL_TYPES:
            raise ValidationError(f"Unknown model_type '{model_type}'.")
        
        company_id = request.data.get("company_id")
        
        try:
            registry = services.train_single_model(request.user, model_type, company_id=company_id)
        except InsufficientSamplesError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_SAMPLES",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
                "recommendation": [
                    "Ensure you have selected the correct Client and Company workspace.",
                    "Verify you have added enough data for this workspace."
                ]
            }, status=400)
        except InsufficientClassDiversityError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_CLASS_DIVERSITY",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
                "unique_classes": exc.unique_classes,
                "class_distribution": exc.class_distribution,
                "recommendation": [
                    "At least two target classes are required.",
                    "Add historical records of differing classes before training."
                ]
            }, status=400)
        except InsufficientDataError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_TRAINING_DATA",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
                "recommendation": [
                    "Ensure you have selected the correct Client and Company workspace.",
                    "Verify you have added enough data for this workspace."
                ]
            }, status=400)
        return Response({"success": True, "message": f"'{model_type}' trained.", "data": registry})


class TrainDemoModelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, model_type):
        company_id = request.data.get("company_id")
        try:
            registry = services.train_single_model(request.user, model_type, company_id=company_id, is_demo=True)
        except InsufficientSamplesError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_SAMPLES",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
            }, status=400)
        except InsufficientClassDiversityError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_CLASS_DIVERSITY",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
                "unique_classes": exc.unique_classes,
                "class_distribution": exc.class_distribution,
            }, status=400)
        except InsufficientDataError as exc:
            return Response({
                "success": False,
                "error_code": "INSUFFICIENT_TRAINING_DATA",
                "message": str(exc),
                "required_samples": exc.rows_required,
                "available_samples": exc.rows_available,
            }, status=400)
        return Response({"success": True, "message": f"Demo model for '{model_type}' trained successfully.", "data": registry})


class MLReadinessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company_id = request.query_params.get("company_id")
        from apps.ml.services import resolve_company_scope
        company_ids, _ = resolve_company_scope(request.user, company_id)
        
        from apps.mongo import connection as mongo_connection
        db = mongo_connection.get_db()
        
        # Expense Categorization readiness
        expense_txns = list(db.transactions.find({
            "company_id": {"$in": company_ids},
            "type": "expense",
            "status": {"$ne": "deleted"},
            "category_id": {"$ne": None},
        }, {"category_id": 1}))
        
        available_expense = len(expense_txns)
        unique_categories = len(set(str(t.get("category_id")) for t in expense_txns if t.get("category_id")))
        
        # Compliance Risk readiness
        from apps.ml.train import _monthly_compliance_snapshots, _production_risk_label
        
        compliance_ready = False
        compliance_reason = ""
        compliance_unique_classes = 0
        compliance_class_dist = {}
        compliance_samples = 0
        
        try:
            compliance_df = _monthly_compliance_snapshots(request.user, company_ids)
            compliance_samples = len(compliance_df)
            if compliance_samples < MIN_ROWS_CLASSIFIER:
                compliance_reason = "Need at least 15 samples."
            else:
                compliance_df["label"] = compliance_df.apply(_production_risk_label, axis=1)
                compliance_unique_classes = compliance_df["label"].nunique()
                compliance_class_dist = compliance_df["label"].value_counts().to_dict()
                if compliance_unique_classes < 2:
                    compliance_reason = "Need at least two classes."
                else:
                    compliance_ready = True
        except Exception:
            compliance_reason = "Error calculating readiness."
            
        compliance_production = {
            "ready": compliance_ready,
            "available_samples": compliance_samples,
            "required_samples": MIN_ROWS_CLASSIFIER,
            "unique_classes": compliance_unique_classes,
            "class_distribution": compliance_class_dist,
            "reason": compliance_reason if compliance_reason else "Ready for training."
        }
        
        compliance_demo = {
            "available": compliance_samples >= MIN_ROWS_CLASSIFIER,
            "reason": "Demo training available." if compliance_samples >= MIN_ROWS_CLASSIFIER else "Not enough data for Demo training."
        }
        
        # Fraud Detection readiness
        fraud_txns = db.transactions.count_documents({
            "company_id": {"$in": company_ids},
            "status": {"$ne": "deleted"},
            "type": {"$in": ["income", "expense"]}
        })
        
        from apps.ml.features import MIN_ROWS_CLASSIFIER, MIN_ROWS_REGRESSION
        
        return Response({
            "success": True,
            "data": {
                ml_utils.MODEL_EXPENSE_CATEGORIZATION: {
                    "production": {
                        "ready": available_expense >= MIN_ROWS_CLASSIFIER and unique_categories >= 2,
                        "available_samples": available_expense,
                        "required_samples": MIN_ROWS_CLASSIFIER,
                        "unique_classes": unique_categories,
                        "reason": "Need at least 15 samples and 2 categories." if (available_expense < MIN_ROWS_CLASSIFIER or unique_categories < 2) else ""
                    },
                    "demo": {
                        "available": False,
                        "reason": "Demo training not available for this model."
                    }
                },
                ml_utils.MODEL_COMPLIANCE_RISK: {
                    "production": compliance_production,
                    "demo": compliance_demo
                },
                ml_utils.MODEL_FRAUD_DETECTION: {
                    "production": {
                        "ready": fraud_txns >= MIN_ROWS_CLASSIFIER,
                        "available_samples": fraud_txns,
                        "required_samples": MIN_ROWS_CLASSIFIER,
                        "reason": "Need at least 15 samples." if fraud_txns < MIN_ROWS_CLASSIFIER else ""
                    },
                    "demo": {
                        "available": False,
                        "reason": "Demo training not available for this model."
                    }
                },
                ml_utils.MODEL_TAX_LIABILITY: {
                    "production": {
                        "ready": tax_forecast >= MIN_ROWS_REGRESSION,
                        "available_samples": tax_forecast,
                        "required_samples": MIN_ROWS_REGRESSION,
                        "reason": "Need at least 3 months of data." if tax_forecast < MIN_ROWS_REGRESSION else ""
                    },
                    "demo": {
                        "available": False,
                        "reason": "Demo training not available for this model."
                    }
                },
                ml_utils.MODEL_EXPENSE_FORECAST: {
                    "production": {
                        "ready": expense_forecast >= MIN_ROWS_REGRESSION,
                        "available_samples": expense_forecast,
                        "required_samples": MIN_ROWS_REGRESSION,
                        "reason": "Need at least 3 months of data." if expense_forecast < MIN_ROWS_REGRESSION else ""
                    },
                    "demo": {
                        "available": False,
                        "reason": "Demo training not available for this model."
                    }
                },
            }
        })

# ---------------------------------------------------------------------------
# Module 1 — Expense categorization
# ---------------------------------------------------------------------------

class ExpenseCategorizationPredictView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CategorizationPredictSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = _wrap_prediction(
            pred.predict_expense_categories, request.user,
            transaction_ids=serializer.validated_data.get("transaction_ids"),
            default_return=[]
        )
        for r in results:
            r["explanation"] = pred.explain_categorization(r)
            ml_utils.log_prediction(request.user.id, ml_utils.MODEL_EXPENSE_CATEGORIZATION, "transaction", r["transaction_id"], r)
        return Response({"success": True, "data": results})


class ApplyCategorizationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ApplyCategorizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from apps.transactions.services import update_transaction
        from apps.mongo import connection as mongo_connection
        db = mongo_connection.get_db()
        category = db.transaction_categories.find_one({"name": serializer.validated_data["category_name"]})
        if not category:
            raise ValidationError("Unknown category name.")
        txn = update_transaction(
            request.user, serializer.validated_data["transaction_id"],
            {"category_id": str(category["_id"])},
        )
        return Response({"success": True, "message": "Category applied.", "data": txn})


# ---------------------------------------------------------------------------
# Module 2 — Duplicate Transaction Detection
# ---------------------------------------------------------------------------

class DuplicateTransactionView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        results = _wrap_prediction(pred.predict_fraud_anomalies, request.user, company_id=_company_id(request), default_return=[])
        for r in results:
            r["explanation"] = pred.explain_fraud(r)
        return Response({"success": True, "data": results})


# ---------------------------------------------------------------------------
# Module 3 — Compliance risk prediction
# ---------------------------------------------------------------------------

class ComplianceRiskView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request):
        company_id = _company_id(request)
        company_ids, _ = services.resolve_company_scope(request.user, company_id)
        results = _wrap_prediction(pred.predict_compliance_risk, request.user, company_ids, default_return=[])
        entry = ml_utils.get_model_registry_entry(request.user.id, ml_utils.MODEL_COMPLIANCE_RISK, is_demo=False)
        if not entry:
            entry = ml_utils.get_model_registry_entry(request.user.id, ml_utils.MODEL_COMPLIANCE_RISK, is_demo=True)
        model_bundle = ml_utils.load_model_artifact(entry["file_path"]) if entry else None
        for r in results:
            if model_bundle:
                r["explanation"] = pred.explain_compliance_risk(r, model_bundle["model"], model_bundle.get("feature_columns", model_bundle.get("features")))
            else:
                r["explanation"] = f"Predicted {r['risk_level']} risk."
        return Response({"success": True, "data": results})


class ComplianceRiskRulesView(APIView):
    """Exposes the plain-English decision rules learned by the tree, for
    full transparency on the model-management screen."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entry = ml_utils.get_model_registry_entry(request.user.id, ml_utils.MODEL_COMPLIANCE_RISK, is_demo=False)
        if not entry:
            entry = ml_utils.get_model_registry_entry(request.user.id, ml_utils.MODEL_COMPLIANCE_RISK, is_demo=True)
        if not entry:
            raise NotFound("Compliance risk model has not been trained yet.")
        bundle = ml_utils.load_model_artifact(entry["file_path"])
        model = bundle["model"]
        rules = pred.decision_tree_rules_text(model, bundle["feature_columns"], list(model.classes_))
        return Response({"success": True, "data": {"rules": rules}})


# ---------------------------------------------------------------------------
# Modules 4 & 5 — Forecasts
# ---------------------------------------------------------------------------

class TaxLiabilityForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ForecastQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        forecast, entry = _wrap_prediction(pred.predict_tax_liability, request.user, serializer.validated_data["periods_ahead"], default_return=([], {"metrics": {}}))
        for f in forecast:
            f["explanation"] = pred.explain_forecast(ml_utils.MODEL_TAX_LIABILITY, f, entry["metrics"])
        return Response({"success": True, "data": {"forecast": forecast, "model_metrics": entry["metrics"]}})


class ExpenseForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ForecastQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        forecast, entry = _wrap_prediction(pred.predict_expense_forecast, request.user, serializer.validated_data["periods_ahead"], default_return=([], {"metrics": {}}))
        for f in forecast:
            f["explanation"] = pred.explain_forecast(ml_utils.MODEL_EXPENSE_FORECAST, f, entry["metrics"])
        return Response({"success": True, "data": {"forecast": forecast, "model_metrics": entry["metrics"]}})


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

REPORT_BUILDERS = {
    "duplicate-transactions": lambda user, company_id, fmt: services.build_duplicate_transaction_report(user, company_id, fmt),
    "expense-forecast": lambda user, company_id, fmt: services.build_expense_forecast_report(user, fmt),
    "tax-prediction": lambda user, company_id, fmt: services.build_tax_prediction_report(user, fmt),
    "compliance-risk": lambda user, company_id, fmt: services.build_compliance_risk_report(user, company_id, fmt),
}


class MLReportDownloadView(APIView):
    permission_classes = [IsAuthenticated, RequireCompanyAccess]

    def get(self, request, report_type):
        if report_type not in REPORT_BUILDERS:
            raise NotFound(f"Unknown report type '{report_type}'. Available: {list(REPORT_BUILDERS.keys())}")
        serializer = ReportQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        fmt = serializer.validated_data["file_format"]
        company_id = serializer.validated_data.get("company_id")

        content, content_type, ext = REPORT_BUILDERS[report_type](request.user, company_id, fmt)
        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{report_type}-report.{ext}"'
        return response
