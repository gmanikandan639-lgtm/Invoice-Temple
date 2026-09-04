import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  Edit2,
  Trash2,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { UserAccount, UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface AdminUserListViewProps {
  onNavigate: (path: string) => void;
}

export const AdminUserListView: React.FC<AdminUserListViewProps> = ({ onNavigate }) => {
  const { users, addUser, updateUser, deleteUser, toggleUserStatus } = useData();
  const { currentUser, role: authRole } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');

  // Confirmation toggle modal
  const [toggleTargetUser, setToggleTargetUser] = useState<UserAccount | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('user');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setPassword('');
    setRole(u.role);
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name,
          phone,
          role,
          status,
        });
        showToast('User account updated successfully');
      } else {
        await addUser({
          uid: 'uid_' + Date.now().toString().slice(-6),
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
          role,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: 'Never',
        });
        showToast('New user account added successfully. User can authenticate with Google Mail.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Failed to save user: ' + err.message, 'error');
    }
  };

  const confirmToggleStatus = async () => {
    if (!toggleTargetUser) return;
    if (toggleTargetUser.uid === currentUser?.uid) {
      showToast('You cannot disable your own active account', 'error');
      setToggleTargetUser(null);
      return;
    }

    try {
      await toggleUserStatus(toggleTargetUser.id);
      showToast(
        `User ${toggleTargetUser.name} ${
          toggleTargetUser.status === 'active' ? 'disabled' : 'activated'
        }`
      );
      setToggleTargetUser(null);
    } catch (err: any) {
      showToast('Error modifying status: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.uid === currentUser?.uid) {
      showToast('You cannot delete your own active account', 'error');
      return;
    }

    if (confirm(`Permanently remove staff account ${u.name}?`)) {
      try {
        await deleteUser(u.id);
        showToast('Account removed');
      } catch (err: any) {
        showToast('Delete error: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            User &amp; Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage staff credentials, role-based privileges, and authorization statuses
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add User Account
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
        >
          <option value="All">All Roles</option>
          <option value="admin">Administrator</option>
          <option value="user">Billing Staff / User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Account Status</th>
                <th className="px-5 py-3">Last Login</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      {u.phone || '-'}
                    </td>

                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setToggleTargetUser(u)}
                        className="cursor-pointer"
                        title="Click to toggle status"
                      >
                        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status === 'active' ? 'Active' : 'Disabled'}
                        </Badge>
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      {u.lastLogin || 'Never'}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          title="Edit User"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="Delete User"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Credentials' : 'Register New User'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Google Mail Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!!editingUser}
              placeholder="e.g. employee@gmail.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs disabled:bg-slate-100 disabled:text-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">User can log in directly using Google Mail authentication.</p>
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Initial Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional if signing in via Google"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role Privilege *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
              >
                <option value="user">Billing Staff (User)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {editingUser && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs cursor-pointer"
            >
              {editingUser ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Toggle status */}
      {toggleTargetUser && (
        <Modal
          isOpen={!!toggleTargetUser}
          onClose={() => setToggleTargetUser(null)}
          title="Account Status Confirmation"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to{' '}
              <strong>{toggleTargetUser.status === 'active' ? 'disable' : 'activate'}</strong> access
              for <strong>{toggleTargetUser.name}</strong> ({toggleTargetUser.email})?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setToggleTargetUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                  toggleTargetUser.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Confirm {toggleTargetUser.status === 'active' ? 'Disable' : 'Activate'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
