"use client";

import React, { useState, useEffect } from "react";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
  adminCreateUser,
  getUserLoans,
  UserProfile,
  Loan,
  updateProfile
} from "../lib/storage";
import { formatCurrency, setGlobalCurrency } from "../lib/utils";
import {
  Users,
  TrendingUp,
  Wallet,
  UserPlus,
  Shield,
  Trash2,
  Eye,
  Search,
  X,
  Lock,
  ChevronRight,
  UserCheck,
  BookOpen,
  Pencil,
  Settings
} from "lucide-react";

interface AdminPanelProps {
  currentAdmin: UserProfile;
  onImpersonateUser: (user: UserProfile, loans: Loan[]) => void;
  onClose: () => void;
}

interface UserWithStats extends UserProfile {
  loansCount: number;
  totalEmi: number;
  totalDebt: number;
}

export default function AdminPanel({ currentAdmin, onImpersonateUser, onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserIncome, setNewUserIncome] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Admin details editing state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [adminName, setAdminName] = useState(currentAdmin.name);
  const [adminIncome, setAdminIncome] = useState(currentAdmin.monthlyIncome.toString());
  const [adminCurrency, setAdminCurrency] = useState(currentAdmin.currency || "USD");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // User editing states
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editIncome, setEditIncome] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Load users and calculate stats
  const fetchUsersAndStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsersList = await getAllUsers();
      const usersWithStatsList: UserWithStats[] = await Promise.all(
        allUsersList.map(async (u) => {
          try {
            const userLoans = await getUserLoans(u.uid);
            const activeLoans = userLoans.filter((l) => l.status === "Active");
            const loansCount = activeLoans.length;
            const totalEmi = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
            const totalDebt = activeLoans.reduce((sum, l) => {
              // Estimate outstanding
              const paid = l.monthsCompleted * l.emiAmount;
              const remaining = l.totalAmount - paid;
              return sum + Math.max(0, remaining);
            }, 0);
            return {
              ...u,
              loansCount,
              totalEmi,
              totalDebt,
            };
          } catch {
            return {
              ...u,
              loansCount: 0,
              totalEmi: 0,
              totalDebt: 0,
            };
          }
        })
      );
      setUsers(usersWithStatsList);
    } catch (err: any) {
      setError(err.message || "Failed to load user directories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndStats();
  }, []);

  // Handlers
  const handleToggleRole = async (user: UserWithStats) => {
    if (user.uid === currentAdmin.uid) {
      alert("You cannot modify your own administrative permissions.");
      return;
    }
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await updateUserRole(user.uid, newRole);
      setUsers(users.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      alert(err.message || "Failed to update role permissions.");
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === currentAdmin.uid) {
      alert("You cannot delete your own administrative account.");
      return;
    }
    if (!window.confirm(`Are you absolutely sure you want to delete ${name}'s user profile and all their active loan obligations?`)) {
      return;
    }
    try {
      await deleteUserAccount(uid);
      setUsers(users.filter((u) => u.uid !== uid));
    } catch (err: any) {
      alert(err.message || "Failed to delete user profile.");
    }
  };

  const handleInspectUser = async (user: UserWithStats) => {
    try {
      const userLoans = await getUserLoans(user.uid);
      onImpersonateUser(user, userLoans);
    } catch (err: any) {
      alert(err.message || "Failed to load details for user dashboard.");
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserIncome.trim()) {
      setFormError("Please fill in all details.");
      setFormSubmitting(false);
      return;
    }

    const incomeVal = parseFloat(newUserIncome);
    if (isNaN(incomeVal) || incomeVal < 0) {
      setFormError("Please enter a valid monthly income.");
      setFormSubmitting(false);
      return;
    }

    try {
      await adminCreateUser(
        newUserEmail,
        newUserPassword,
        newUserName,
        incomeVal,
        newUserRole
      );
      // Reset form
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserIncome("");
      setNewUserRole("user");
      setIsAddUserOpen(false);
      // Reload
      fetchUsersAndStats();
    } catch (err: any) {
      setFormError(err.message || "Failed to manually register user.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditUserClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditIncome(user.monthlyIncome.toString());
    setEditCurrency(user.currency || "USD");
    setEditRole(user.role || "user");
    setEditError(null);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditLoading(true);

    if (!editName.trim() || !editIncome.trim()) {
      setEditError("Name and income cannot be empty.");
      setEditLoading(false);
      return;
    }

    const incomeVal = parseFloat(editIncome);
    if (isNaN(incomeVal) || incomeVal < 0) {
      setEditError("Please enter a valid monthly income.");
      setEditLoading(false);
      return;
    }

    try {
      await updateProfile(editingUser.uid, {
        name: editName.trim(),
        monthlyIncome: incomeVal,
        currency: editCurrency,
        role: editRole,
      });
      setEditingUser(null);
      fetchUsersAndStats();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user details.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdminSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    if (!adminName.trim() || !adminIncome.trim()) {
      setAdminError("Name and income cannot be empty.");
      setAdminLoading(false);
      return;
    }

    const incomeVal = parseFloat(adminIncome);
    if (isNaN(incomeVal) || incomeVal < 0) {
      setAdminError("Please enter a valid monthly income.");
      setAdminLoading(false);
      return;
    }

    try {
      await updateProfile(currentAdmin.uid, {
        name: adminName.trim(),
        monthlyIncome: incomeVal,
        currency: adminCurrency,
      });
      setGlobalCurrency(adminCurrency);
      setIsSettingsOpen(false);
      fetchUsersAndStats();
    } catch (err: any) {
      setAdminError(err.message || "Failed to update settings.");
    } finally {
      setAdminLoading(false);
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.role === "admin") ||
      (roleFilter === "user" && u.role !== "admin");
    return matchesSearch && matchesRole;
  });

  // Global metrics
  const totalUsers = users.length;
  const totalActiveLoans = users.reduce((sum, u) => sum + u.loansCount, 0);
  const totalMonthlyEmi = users.reduce((sum, u) => sum + u.totalEmi, 0);
  const totalOutstandingDebt = users.reduce((sum, u) => sum + u.totalDebt, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-12 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[500px] rounded-full bg-slate-100 blur-3xl -z-10 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                emi.calm Panel
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">Master Admin Directory</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer shadow-sm"
              title="System & Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Go to My Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1 flex flex-col gap-8">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Users */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{loading ? "..." : totalUsers}</h3>
            </div>
          </div>

          {/* Card 2: Active Commitments */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <BookOpen className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Loans</p>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{loading ? "..." : totalActiveLoans}</h3>
            </div>
          </div>

          {/* Card 3: Total Monthly EMIs */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Wallet className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Outflow</p>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{loading ? "..." : formatCurrency(totalMonthlyEmi)}</h3>
            </div>
          </div>

          {/* Card 4: Total Outstanding Debt */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Debt</p>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{loading ? "..." : formatCurrency(totalOutstandingDebt)}</h3>
            </div>
          </div>
        </div>

        {/* Directory Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">User Directory</h2>
            <p className="text-xs text-slate-400">View user portfolios, adjust permissions, and add new portfolios manually.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 w-60 transition-all"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={roleFilter}
              onChange={(e: any) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Administrators</option>
            </select>

            {/* Add User Button */}
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 flex-1">
              <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading directory...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No users found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Try refining your search text or switching the role filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/40">
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Monthly Income</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active EMIs</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Monthly Outflow</th>
                    <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/30 transition-all">
                      {/* Name & Email */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{user.email}</div>
                      </td>
                      {/* Role Badge */}
                      <td className="px-6 py-4.5">
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200">
                            User
                          </span>
                        )}
                      </td>
                      {/* Income */}
                      <td className="px-6 py-4.5 font-semibold text-slate-700 text-sm">
                        {formatCurrency(user.monthlyIncome)}
                      </td>
                      {/* Loans count */}
                      <td className="px-6 py-4.5 text-slate-700 text-sm font-semibold">
                        {user.loansCount}
                      </td>
                      {/* Total EMI */}
                      <td className="px-6 py-4.5 font-bold text-rose-600 text-sm">
                        {formatCurrency(user.totalEmi)}
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Inspect user dashboard */}
                          <button
                            onClick={() => handleInspectUser(user)}
                            title="Inspect Dashboard"
                            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit user details */}
                          <button
                            onClick={() => handleEditUserClick(user)}
                            title="Edit User Details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Toggle permissions */}
                          <button
                            onClick={() => handleToggleRole(user)}
                            title={user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                            disabled={user.uid === currentAdmin.uid}
                            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          {/* Delete profile */}
                          <button
                            onClick={() => handleDeleteUser(user.uid, user.name)}
                            title="Delete User"
                            disabled={user.uid === currentAdmin.uid}
                            className="p-1.5 text-rose-500 hover:text-rose-700 border border-rose-100 bg-rose-50/20 hover:bg-rose-50 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Manual User Creator Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddUserOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800 mb-4">
              <UserPlus className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 mb-1">Create User Manually</h3>
            <p className="text-xs text-slate-400 mb-6">Enter credentials to add a pre-onboarded user to the database.</p>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="adm-name">
                  Full Name
                </label>
                <input
                  id="adm-name"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="adm-email">
                  Email Address
                </label>
                <input
                  id="adm-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 placeholder:text-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="adm-pass">
                  Initial Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="adm-pass"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="adm-income">
                    Monthly Income ($)
                  </label>
                  <input
                    id="adm-income"
                    type="number"
                    value={newUserIncome}
                    onChange={(e) => setNewUserIncome(e.target.value)}
                    placeholder="5500"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 placeholder:text-slate-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="adm-role">
                    Permission Role
                  </label>
                  <select
                    id="adm-role"
                    value={newUserRole}
                    onChange={(e: any) => setNewUserRole(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-[2] inline-flex items-center justify-center gap-1 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {formSubmitting ? "Creating..." : "Create Account"}
                  {!formSubmitting && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800 mb-4">
              <Settings className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 mb-1">System & Admin Settings</h3>
            <p className="text-xs text-slate-400 mb-6">Manage default currencies and your administrative profile.</p>

            <form onSubmit={handleAdminSettingsSubmit} className="space-y-4">
              {/* Default System Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="currency">
                  App Default Currency
                </label>
                <select
                  id="currency"
                  value={adminCurrency}
                  onChange={(e) => setAdminCurrency(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                >
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 This alters currency displays globally across standard screens and dashboards.
                </p>
              </div>

              {/* Admin Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="admin-name-field">
                  Admin Name
                </label>
                <input
                  id="admin-name-field"
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                />
              </div>

              {/* Admin Income */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="admin-income-field">
                  Admin Monthly Income
                </label>
                <input
                  id="admin-income-field"
                  type="number"
                  value={adminIncome}
                  onChange={(e) => setAdminIncome(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                />
              </div>

              {adminError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {adminError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminLoading}
                  className="flex-[2] px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {adminLoading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-800 mb-4">
              <Pencil className="w-5 h-5 animate-pulse" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-950 mb-1">Edit User Profile</h3>
            <p className="text-xs text-slate-400 mb-6">Modify details for <strong className="text-slate-700">{editingUser.name}</strong>.</p>

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="edit-name">
                  Full Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                />
              </div>

              {/* Monthly Income */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="edit-income">
                  Monthly Income
                </label>
                <input
                  id="edit-income"
                  type="number"
                  value={editIncome}
                  onChange={(e) => setEditIncome(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Currency selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="edit-currency">
                    User Currency
                  </label>
                  <select
                    id="edit-currency"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5" htmlFor="edit-role">
                    User Role
                  </label>
                  <select
                    id="edit-role"
                    value={editRole}
                    onChange={(e: any) => setEditRole(e.target.value)}
                    disabled={editingUser.uid === currentAdmin.uid}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-sm text-slate-800 transition-all disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-[2] px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
