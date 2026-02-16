"use client";
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/utils/api';

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if(email) {
        setUserEmail(email);
        fetch(`${API_URL}/api/applications/${email}`).then(res => res.json()).then(setApps);
    }
  }, []);

  const getStatusStyle = (status: string) => {
    switch(status) {
        case 'Hired': return 'bg-green-100 text-green-700 border-green-200';
        case 'Rejected': return 'bg-red-50 text-red-600 border-red-200';
        case 'Interviewing': return 'bg-blue-50 text-blue-600 border-blue-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Application Tracker</h1>
        <p className="text-slate-500 mb-6 text-sm">Monitor your self-applications and referrals.</p>
        
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b">
                    <tr>
                        <th className="p-5">Type</th>
                        <th className="p-5">Candidate</th>
                        <th className="p-5">Job Role</th>
                        <th className="p-5">Company</th>
                        <th className="p-5">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {apps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50 transition">
                            <td className="p-5">
                                {app.referrer_email === userEmail ? (
                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded border border-purple-200">YOU REFERRED</span>
                                ) : (
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded border border-blue-200">SELF APPLY</span>
                                )}
                            </td>
                            <td className="p-5 font-medium text-slate-800">{app.user_email}</td>
                            <td className="p-5 font-bold text-slate-800">{app.job_title}</td>
                            <td className="p-5 text-slate-600">{app.company}</td>
                            <td className="p-5">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(app.status)}`}>
                                    {app.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {apps.length === 0 && <div className="p-10 text-center text-slate-400">No records found.</div>}
        </div>
    </div>
  );
}