"use client";
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/utils/api';

export default function ManageApplications() {
  const [apps, setApps] = useState<any[]>([]);

  useEffect(() => { fetchApps(); }, []);

  const fetchApps = async () => {
    const res = await fetch(`${API_URL}/api/recruiter/applications`);
    const data = await res.json();
    setApps(data);
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Optimistic Update (Update UI immediately)
    setApps(apps.map(app => app.id === id ? { ...app, status: newStatus } : app));
    
    // Send to Backend
    await fetch(`${API_URL}/api/applications/status`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
    });
  };

  // Status Styling Logic
  const getStatusStyle = (status: string) => {
    switch(status) {
        case 'Hired': return 'bg-green-100 text-green-700 border-green-200';
        case 'Rejected': return 'bg-red-50 text-red-600 border-red-200';
        case 'Interviewing': return 'bg-blue-50 text-blue-600 border-blue-200';
        case 'Shortlisted': return 'bg-purple-50 text-purple-600 border-purple-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Candidate Pipeline</h1>
                <p className="text-slate-500 text-sm">Manage applicants and track hiring progress.</p>
            </div>
            <button onClick={fetchApps} className="text-sm font-bold text-indigo-600 hover:underline">Refresh Data ↻</button>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                        <th className="p-5">Candidate</th>
                        <th className="p-5">Role Applied</th>
                        <th className="p-5">Applied Date</th>
                        <th className="p-5">AI Screening</th>
                        <th className="p-5">Status Update</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {apps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/80 transition group">
                            <td className="p-5">
                                <div className="font-bold text-slate-800">{app.user_email}</div>
                                <div className="text-xs text-slate-400 font-medium">ID: #{app.id}</div>
                            </td>
                            <td className="p-5">
                                <div className="font-medium text-slate-900">{app.job_title}</div>
                                <div className="text-xs text-slate-500">{app.company}</div>
                            </td>
                            <td className="p-5 text-slate-500 text-sm font-medium">{app.date}</td>
                            <td className="p-5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border
                                        ${app.ai_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
                                          app.ai_score >= 50 ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                          'bg-red-50 text-red-700 border-red-200'}`}>
                                        {app.ai_score}
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium">/ 100 Match</span>
                                </div>
                            </td>
                            <td className="p-5">
                                <div className="relative">
                                    <select 
                                        value={app.status}
                                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                        className={`appearance-none w-40 py-2 pl-3 pr-8 rounded-lg text-xs font-bold border outline-none cursor-pointer transition shadow-sm
                                            ${getStatusStyle(app.status)} focus:ring-2 focus:ring-indigo-500/20`}
                                    >
                                        <option value="Received">Received</option>
                                        <option value="Shortlisted">Shortlisted</option>
                                        <option value="Interviewing">Interviewing</option>
                                        <option value="Hired">Hired</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                    {/* Custom Chevron Icon */}
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-50">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {apps.length === 0 && <div className="p-12 text-center text-slate-400 font-medium">No applications found yet.</div>}
        </div>
    </div>
  );
}