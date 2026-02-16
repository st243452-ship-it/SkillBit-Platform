"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

const INDIAN_CITIES = ["Bangalore", "Hyderabad", "Mumbai", "Pune", "Delhi NCR", "Chennai", "Gurgaon", "Noida", "Remote"];

export default function RecruiterDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'manage' | 'post' | 'candidates'>('manage');
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [user, setUser] = useState<any>({});
  const [successModal, setSuccessModal] = useState(false);
  
  // FORM STATE
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [jobForm, setJobForm] = useState({ title: "", company: "", location: "", salary: "", description: "", experience: "", skills: "", referral_bonus: 0 });
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if(!email) router.push('/');
    fetch(`${API_URL}/api/user/${email}`).then(res => res.json()).then(setUser);
    fetchJobs();
    fetchCandidates();
  }, [activeTab]);

  const fetchJobs = async () => {
    const email = localStorage.getItem("user_email");
    const res = await fetch(`${API_URL}/api/recruiter/jobs/${email}`);
    setJobs(await res.json());
  };

  const fetchCandidates = async () => {
    const email = localStorage.getItem("user_email");
    const res = await fetch(`${API_URL}/api/recruiter/candidates/${email}`);
    setCandidates(await res.json());
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setJobForm({...jobForm, location: val});
    if(val.length > 0) {
        setLocationSuggestions(INDIAN_CITIES.filter(city => city.toLowerCase().includes(val.toLowerCase())));
    } else {
        setLocationSuggestions([]);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isEditing ? `/api/jobs/${isEditing}` : "/api/jobs";
    const method = isEditing ? "PUT" : "POST";

    await fetch(`${API_URL}${endpoint}`, {
        method: method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...jobForm, recruiter_email: user.email, company: user.company })
    });
    
    setSuccessModal(true);
    setJobForm({ title: "", company: "", location: "", salary: "", description: "", experience: "", skills: "", referral_bonus: 0 });
    setIsEditing(null);
    setTimeout(() => { setSuccessModal(false); setActiveTab('manage'); fetchJobs(); }, 2000);
  };

  const startEdit = (job: any) => {
    setJobForm({
        title: job.title, company: job.company, location: job.location, salary: job.salary, 
        description: job.description, experience: job.experience, skills: job.skills, referral_bonus: job.referral_bonus
    });
    setIsEditing(job.id);
    setActiveTab('post');
  };

  const deleteJob = async (id: number) => {
    if(confirm("Delete this job listing?")) {
        await fetch(`${API_URL}/api/jobs/${id}`, { method: "DELETE" });
        fetchJobs();
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`${API_URL}/api/applications/status`, {
        method: "PUT", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id, status })
    });
    fetchCandidates();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        {/* TOP NAV - Professional Color (Midnight Blue) */}
        <nav className="bg-[#1e293b] text-white px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md border-b border-slate-700">
            <div className="flex items-center gap-8">
                <div className="text-xl font-bold tracking-tight">SkillBit <span className="text-blue-400 font-normal">Recruiter</span></div>
                <div className="flex gap-6 text-sm font-medium text-slate-300">
                    <button onClick={() => setActiveTab('manage')} className={`hover:text-white transition py-1 ${activeTab === 'manage' ? 'text-white border-b-2 border-blue-400' : ''}`}>Dashboard</button>
                    <button onClick={() => { setActiveTab('post'); setIsEditing(null); setJobForm({ title: "", company: "", location: "", salary: "", description: "", experience: "", skills: "", referral_bonus: 0 }); }} className={`hover:text-white transition py-1 ${activeTab === 'post' ? 'text-white border-b-2 border-blue-400' : ''}`}>Post Job</button>
                    <button onClick={() => setActiveTab('candidates')} className={`hover:text-white transition py-1 ${activeTab === 'candidates' ? 'text-white border-b-2 border-blue-400' : ''}`}>Candidates</button>
                </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
                <div className="text-right hidden md:block leading-tight">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">{user.designation} @ {user.company}</div>
                </div>
                <button onClick={() => {localStorage.clear(); router.push('/')}} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition text-xs font-bold">Logout</button>
            </div>
        </nav>

        {/* SUCCESS MODAL */}
        {successModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center animate-scale-up">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🎉</span></div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{isEditing ? "Updates Saved!" : "Job Published!"}</h2>
                    <p className="text-slate-500">Your listing is now live for candidates.</p>
                </div>
            </div>
        )}

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto p-8">
            {activeTab === 'manage' && (
                <div>
                    <h1 className="text-2xl font-bold mb-6 text-slate-800">Overview</h1>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                <tr><th className="px-6 py-4">Role</th><th className="px-6 py-4">Location</th><th className="px-6 py-4">Posted</th><th className="px-6 py-4">Salary</th><th className="px-6 py-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {jobs.map(job => (
                                    <tr key={job.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-900">{job.title}</td>
                                        <td className="px-6 py-4 text-slate-600">{job.location}</td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">{job.posted_date}</td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">{job.salary}</td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button onClick={() => startEdit(job)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded">Edit</button>
                                            <button onClick={() => deleteJob(job.id)} className="text-red-600 hover:text-red-800 font-bold text-xs bg-red-50 px-3 py-1.5 rounded">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {jobs.length === 0 && <div className="p-12 text-center text-slate-400">No active jobs found. Click 'Post Job' to create one.</div>}
                    </div>
                </div>
            )}

            {activeTab === 'post' && (
                <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl border border-slate-200 shadow-xl">
                    <h1 className="text-2xl font-bold mb-8 text-slate-900">{isEditing ? "Edit Job Details" : "Create New Requisition"}</h1>
                    <form onSubmit={handlePostJob} className="grid grid-cols-2 gap-6">
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Job Title</label><input required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} /></div>
                        
                        <div className="relative">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Location</label>
                            <input required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.location} onChange={handleLocationChange} placeholder="Type to search..." />
                            {locationSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-10 max-h-40 overflow-y-auto">
                                    {locationSuggestions.map(city => (
                                        <div key={city} onClick={() => {setJobForm({...jobForm, location: city}); setLocationSuggestions([])}} className="p-2 hover:bg-blue-50 cursor-pointer text-sm">{city}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Salary Range</label><input required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.salary} onChange={e => setJobForm({...jobForm, salary: e.target.value})} /></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label><textarea required rows={4} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Experience</label><input required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.experience} onChange={e => setJobForm({...jobForm, experience: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Skills</label><input required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={jobForm.skills} onChange={e => setJobForm({...jobForm, skills: e.target.value})} /></div>
                        <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100"><label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Referral Bonus (₹) - Optional</label><input type="number" className="w-full p-3 border border-blue-200 rounded-lg outline-none font-bold text-blue-900" value={jobForm.referral_bonus} onChange={e => setJobForm({...jobForm, referral_bonus: parseInt(e.target.value) || 0})} /></div>
                        <button className="col-span-2 bg-slate-900 text-white py-4 rounded-xl font-bold hover:shadow-lg transition transform hover:-translate-y-1">{isEditing ? "Update Job Listing" : "Publish Opportunity 🚀"}</button>
                    </form>
                </div>
            )}

            {activeTab === 'candidates' && (
                <div>
                     <h1 className="text-2xl font-bold mb-6 text-slate-800">Candidate Pipeline</h1>
                     <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                                <tr><th className="px-6 py-4">Candidate</th><th className="px-6 py-4">Applied For</th><th className="px-6 py-4">AI Score</th><th className="px-6 py-4">Referral Info</th><th className="px-6 py-4">Status</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {candidates.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-bold text-slate-900">{app.user_email}</td>
                                        <td className="px-6 py-4 text-slate-600">{app.job_title}</td>
                                        <td className="px-6 py-4"><span className={`font-bold px-3 py-1 rounded-full text-xs ${app.ai_score > 75 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{app.ai_score}% Match</span></td>
                                        <td className="px-6 py-4 text-xs text-slate-500">{app.referrer_email ? `Ref by: ${app.referrer_email}` : '-'}</td>
                                        <td className="px-6 py-4">
                                            <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                                                <option>Received</option><option>Interviewing</option><option>Shortlisted</option><option>Hired</option><option>Rejected</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {candidates.length === 0 && <div className="p-12 text-center text-slate-400">No candidates yet.</div>}
                     </div>
                </div>
            )}
        </div>
        <style jsx global>{` @keyframes scale-up { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } } .animate-scale-up { animation: scale-up 0.2s ease-out; } `}</style>
    </div>
  );
}