import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  PhoneCall,
  Mail,
  Globe,
  Calendar,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { getBetaApplications, updateApplicationStatus } from '../services/betaService';
import { getCurrentUser, isAdmin } from '../services/authService';
import './AdminApplicationsPage.css';

export default function AdminApplicationsPage({ onBackToDashboard, onBackToHome }) {
  const [applications, setApplications] = useState(() => getBetaApplications());
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const currentUser = getCurrentUser();
  const authorized = isAdmin() || (currentUser && currentUser.role === 'admin');

  const handleStatusChange = (appId, newStatus) => {
    const updated = updateApplicationStatus(appId, newStatus);
    setApplications(updated);
    setStatusMessage(`Application ${appId} marked as ${newStatus}.`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const filteredApps = applications.filter((app) => {
    const matchesFilter = filterStatus === 'all' || app.status === filterStatus;
    const matchesQuery =
      searchQuery.trim() === '' ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.interestReason && app.interestReason.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesQuery;
  });

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    contacted: applications.filter((a) => a.status === 'contacted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="admin-page-root">
      {/* Top Header */}
      <header className="admin-header-bar">
        <button
          onClick={onBackToDashboard || onBackToHome}
          className="admin-back-btn"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>

        <div className="admin-portal-badge">
          <ShieldAlert size={14} className="text-blue-600" />
          <span>Admin Admissions Desk (Frontend Preview)</span>
        </div>
      </header>

      <main className="admin-main-viewport">
        {/* Title & Stats */}
        <div className="admin-title-row">
          <div>
            <h1 className="admin-heading">Beta Program Applications</h1>
            <p className="admin-subtext">
              Review submissions, inspect intent statements, and admit applicants into upcoming beta cohorts.
            </p>
          </div>

          <div className="admin-stats-pills">
            <span className="stat-pill total">Total: {counts.all}</span>
            <span className="stat-pill pending">Pending: {counts.pending}</span>
            <span className="stat-pill approved">Approved: {counts.approved}</span>
          </div>
        </div>

        {statusMessage && (
          <div className="admin-notice-banner">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="admin-controls-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, country, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-chips-row">
            {['all', 'pending', 'approved', 'contacted', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`filter-chip ${filterStatus === st ? 'active' : ''}`}
              >
                <span>{st.charAt(0).toUpperCase() + st.slice(1)}</span>
                <span className="chip-count">{counts[st]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="admin-cards-list">
          {filteredApps.length === 0 ? (
            <div className="empty-admin-state">
              <Users size={40} className="empty-icon text-slate-300" />
              <h3>No Applications Found</h3>
              <p>There are no beta submissions matching your current search or filter criteria.</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`admin-app-card status-${app.status}`}
              >
                <div className="app-card-header">
                  <div className="app-applicant-identity">
                    <h3 className="applicant-name">{app.name}</h3>
                    <div className="applicant-meta-line">
                      <span className="meta-email">
                        <Mail size={12} />
                        {app.email}
                      </span>
                      <span>•</span>
                      <span className="meta-loc">
                        <Globe size={12} />
                        {app.country} ({app.ageRange})
                      </span>
                      <span>•</span>
                      <span className="meta-prof">{app.profession || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="app-status-badge-wrap">
                    <span className={`status-badge-pill ${app.status}`}>
                      {app.status === 'pending' && <Clock size={11} />}
                      {app.status === 'approved' && <CheckCircle2 size={11} />}
                      {app.status === 'contacted' && <PhoneCall size={11} />}
                      {app.status === 'rejected' && <XCircle size={11} />}
                      <span>{app.status.toUpperCase()}</span>
                    </span>
                    <span className="app-date">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="app-card-body">
                  <div className="intent-box">
                    <span className="intent-label">Interest & Purpose:</span>
                    <p className="intent-text">“{app.interestReason}”</p>
                  </div>

                  {app.preservationGoal && (
                    <div className="intent-box subtle">
                      <span className="intent-label">Preservation Goal:</span>
                      <p className="intent-text">{app.preservationGoal}</p>
                    </div>
                  )}

                  <div className="app-meta-grid">
                    <div className="meta-item">
                      <span className="item-label">Source:</span>
                      <span className="item-value">{app.acquisitionSource}</span>
                    </div>
                    <div className="meta-item">
                      <span className="item-label">Willingness to 15m Test:</span>
                      <span className={`item-value ${app.willingnessToTest === 'Yes' ? 'text-emerald-700 font-semibold' : ''}`}>
                        {app.willingnessToTest}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="app-card-actions">
                  <span className="actions-label">Change Status:</span>
                  <div className="status-buttons-row">
                    <button
                      onClick={() => handleStatusChange(app.id, 'approved')}
                      disabled={app.status === 'approved'}
                      className="btn-status approve"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(app.id, 'contacted')}
                      disabled={app.status === 'contacted'}
                      className="btn-status contact"
                    >
                      <PhoneCall size={13} />
                      <span>Contacted</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(app.id, 'pending')}
                      disabled={app.status === 'pending'}
                      className="btn-status pend"
                    >
                      <Clock size={13} />
                      <span>Set Pending</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(app.id, 'rejected')}
                      disabled={app.status === 'rejected'}
                      className="btn-status reject"
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
