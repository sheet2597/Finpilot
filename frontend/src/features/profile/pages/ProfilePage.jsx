import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { 
  User, Mail, Phone, Building, Shield, Lock, Camera, 
  BarChart2, Bot, FileText, Trash2, Calendar, CheckCircle2, 
  AlertTriangle, Edit2, MapPin, Briefcase, Activity, 
  Wallet, FileSpreadsheet, ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { authApi } from "@/features/auth/api";
import { getApiErrorMessage } from "@/lib/axios";

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------
function formatNumber(num) {
  if (num === null || num === undefined) return "—";
  return new Intl.NumberFormat("en-US").format(num);
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ----------------------------------------------------------------------------
// UI Components
// ----------------------------------------------------------------------------
function Modal({ isOpen, onClose, title, children, actionText = "Save", actionVariant = "primary", actionFormId = "modal-form", isActionLoading = false }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-xl shadow-xl overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <Button variant="secondary" onClick={onClose} disabled={isActionLoading}>Cancel</Button>
          <Button form={actionFormId} type="submit" variant={actionVariant} isLoading={isActionLoading}>{actionText}</Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------------
export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [photoFile, setPhotoFile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  
  // Danger Zone
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const profileForm = useForm({
    defaultValues: {
      full_name: user?.full_name || "",
      mobile_number: user?.mobile_number || "",
      address: user?.profile?.address || "",
      company_name: user?.profile?.company_name || "",
    },
  });

  const passwordForm = useForm();
  const newPassword = passwordForm.watch("new_password");

  if (!user) return null;

  const onSaveProfile = async (values) => {
    setIsSavingProfile(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.append(key, value));
      if (photoFile) formData.append("profile_photo", photoFile);

      const { data } = await authApi.updateProfile(formData);
      if (data.data) setUser(data.data);
      setPhotoFile(null);
      setIsEditingProfile(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async (values) => {
    setIsSavingPassword(true);
    try {
      await authApi.changePassword(values.old_password, values.new_password, values.confirm_password);
      toast.success("Password changed successfully.");
      passwordForm.reset();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change password."));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteText !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }
    if (!deletePassword) {
      toast.error("Password is required to delete account.");
      return;
    }
    
    setIsDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      toast.success("Account deleted permanently.");
      setShowDeleteModal(false);
      window.location.href = "/";
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete account."));
      setIsDeleting(false);
    }
  };

  const initials = user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const avatarPreview = photoFile ? URL.createObjectURL(photoFile) : user.profile?.profile_photo;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      
      {/* ---------------------------------------------------------------- */}
      {/* 1. Hero Section */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-blue-900 via-indigo-800 to-purple-900 p-8 shadow-md">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"></div>
        <div className="absolute top-0 right-1/4 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/20 bg-white text-4xl font-bold text-blue-600 shadow-xl transition-all duration-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-900 border-2 border-white text-white shadow-lg transition-transform hover:scale-105 dark:border-slate-900 dark:bg-slate-800 text-slate-100">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          
          {/* Info */}
          <div className="flex-1 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight">{user.full_name}</h1>
            </div>
            
            <div className="mt-2 inline-flex items-center rounded-md bg-blue-600/60 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm border border-blue-500/30 capitalize">
              {user.user_type === 'businessowner' ? 'Business Owner' : user.user_type}
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-6 text-sm text-blue-100/90 font-medium">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 opacity-80" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 opacity-80" />
                <span>{user.mobile_number || '—'}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium border-t border-white/10 pt-4 text-blue-100/80">
              {user.is_email_verified && (
                <>
                  <div className="flex items-center gap-1.5 text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Email Verified</span>
                  </div>
                  <span className="opacity-30">|</span>
                </>
              )}
              
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                <span>Member since {formatDate(user.date_joined)}</span>
              </div>
              <span className="opacity-30">|</span>

              <div className="flex items-center gap-1.5">
                <span>Account Status</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">Active</span>
              </div>
            </div>
          </div>

          {/* Save Photo Action */}
          {photoFile && (
            <div className="shrink-0">
              <Button size="sm" onClick={() => onSaveProfile(profileForm.getValues())} isLoading={isSavingProfile} className="bg-white text-blue-900 hover:bg-blue-50">
                Save Photo
              </Button>
            </div>
          )}
          
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 2-Column Layout */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* COL 1: Personal Information */}
        <Card className="border-slate-200 shadow-sm dark:border-slate-800/80 dark:bg-[#111A2C]">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white">
              <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Personal Information
            </h3>
            <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} className="h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-300">
              <Edit2 className="h-3 w-3 mr-1" />
              Edit Profile
            </Button>
          </div>
          
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <User className="h-4 w-4" />
                <span>Full Name</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Mail className="h-4 w-4" />
                <span>Email Address</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Phone className="h-4 w-4" />
                <span>Mobile Number</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right">{user.mobile_number || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <MapPin className="h-4 w-4" />
                <span>Address</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right max-w-[50%] truncate" title={user.profile?.address}>{user.profile?.address || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Building className="h-4 w-4" />
                <span>Company Name</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right">{user.profile?.company_name || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                <Briefcase className="h-4 w-4" />
                <span>Role</span>
              </div>
              <span className="font-medium text-slate-900 dark:text-white text-right capitalize">{user.user_type === 'businessowner' ? 'Business Owner' : user.user_type}</span>
            </div>
          </div>
        </Card>

        {/* COL 2: Security & Password */}
        <Card className="border-slate-200 shadow-sm dark:border-slate-800/80 dark:bg-[#111A2C]">
          <h3 className="mb-6 flex items-center gap-2 font-display text-base font-semibold text-slate-900 dark:text-white border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Security
          </h3>
          
          <div className="space-y-4 text-sm mb-8">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Verified</span>
              {user.is_email_verified ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium">
                  Pending <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Last Login</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {formatDateTime(user.last_login_at)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Member Since</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {formatDate(user.date_joined)}
              </span>
            </div>
          </div>

          <h3 className="mb-4 font-display text-sm font-semibold text-slate-900 dark:text-white">
            Change Password
          </h3>
          
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                placeholder="Current Password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500"
                {...passwordForm.register("old_password", { required: "Required" })}
              />
            </div>
            
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                placeholder="New Password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500"
                {...passwordForm.register("new_password", { required: "Required", minLength: { value: 8, message: "Min 8 chars" } })}
              />
            </div>
            
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                placeholder="Confirm New Password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-9 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500"
                {...passwordForm.register("confirm_password", {
                  required: "Required",
                  validate: (v) => v === newPassword || "Passwords mismatch",
                })}
              />
            </div>
            
            <div className="pt-2">
              <Button type="submit" isLoading={isSavingPassword} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                Update Password
              </Button>
            </div>
          </form>
        </Card>

      </div>
      
      {/* ---------------------------------------------------------------- */}
      {/* Danger Zone (Full Width Bottom) */}
      {/* ---------------------------------------------------------------- */}
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white dark:border-red-900/40 dark:bg-[#151114]">
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Danger Zone
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Once you delete your account, there is no going back. Please be certain.<br/>
                This will permanently delete your account and remove all your data from our system.
              </p>
            </div>
          </div>
          
          <div className="shrink-0">
            <Button variant="danger" className="bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={() => setShowDeleteModal(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Edit Profile Modal */}
      {/* ---------------------------------------------------------------- */}
      <Modal 
        isOpen={isEditingProfile} 
        onClose={() => setIsEditingProfile(false)} 
        title="Edit Profile" 
        actionText="Save Changes" 
        actionVariant="primary" 
        actionFormId="edit-profile-form" 
        isActionLoading={isSavingProfile}
      >
        <form id="edit-profile-form" onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <Input label="Full Name" error={profileForm.formState.errors.full_name?.message} {...profileForm.register("full_name", { required: "Required" })} />
          <Input label="Email Address" value={user.email} disabled className="bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed" />
          <Input label="Mobile Number" error={profileForm.formState.errors.mobile_number?.message} {...profileForm.register("mobile_number", { required: "Required" })} />
          <Input label="Address" {...profileForm.register("address")} />
          <Input label="Company Name" {...profileForm.register("company_name")} />
        </form>
      </Modal>

      {/* ---------------------------------------------------------------- */}
      {/* Delete Confirmation Modal */}
      {/* ---------------------------------------------------------------- */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        title="Delete Account" 
        actionText="Delete Account" 
        actionVariant="danger" 
        actionFormId="delete-modal-form" 
        isActionLoading={isDeleting}
      >
        <form id="delete-modal-form" onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="p-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm rounded-lg mb-4 flex items-start gap-3 border border-red-100 dark:border-red-900/30">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>Warning: This action will permanently delete all your companies, transactions, documents, and data.</p>
          </div>
          <Input 
            label="Type DELETE to confirm" 
            value={deleteText} 
            onChange={(e) => setDeleteText(e.target.value)} 
            placeholder="DELETE"
            required
          />
          <Input 
            label="Current Password" 
            type="password" 
            value={deletePassword} 
            onChange={(e) => setDeletePassword(e.target.value)} 
            required
          />
        </form>
      </Modal>

      {/* Footer Text */}
      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-slate-500 dark:text-slate-500">&copy; {new Date().getFullYear()} FinPilot. All rights reserved.</p>
      </div>

    </div>
  );
}
