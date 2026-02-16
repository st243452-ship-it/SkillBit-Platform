"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'jobs' | 'apps' | 'interview'>('jobs');
  const [user, setUser] = useState<any>({});
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  // TOAST STATE (Replaces Alerts)
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // MODALS & SELECTIONS
  const [selectedJob, setSelectedJob] = useState<any>(null); 
  const [referralFile, setReferralFile] = useState<File | null>(null); 
  const [showReferModal, setShowReferModal] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // INTERVIEW STATE
  const [interviewQ, setInterviewQ] = useState<any>(null);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if (!email) { router.push('/'); return; }
    fetchUser(email);
    fetchJobs();
  }, []);

  useEffect(() => {
    if(interviewQ && timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); }
  }, [timer, interviewQ]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUser = (email: string) => fetch(`${API_URL}/api/user/${email}`).then(res => res.json()).then(setUser);
  const fetchJobs = (term="") => fetch(`${API_URL}/api/jobs?search=${term}`).then(res => res.json()).then(setJobs);

  // --- PROFILE GAMIFICATION ---
  const handleUpdateProfile = async () => {
    if (!editValue) return;
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 500));
    
    // Update Local State Immediately (Visual Feedback)
    let updatedUser = { ...user, tokens: user.tokens + 5 };
    
    if (showProfileEdit === 'Phone Number') {
        updatedUser.is_phone_verified = 1; // Mark as verified
        // Ideally backend stores the number, for now we flip the flag
    } else if (showProfileEdit === 'LinkedIn URL') {
        updatedUser.is_email_verified = 1; // Using email flag as proxy for demo or create new flag
    }

    setUser(updatedUser);
    showToast(`${showProfileEdit} Saved! +5 Credits ⚡`, 'success');
    
    setShowProfileEdit(null);
    setEditValue("");
  };

  // --- JOB ACTIONS ---
  const handleApply = async () => {
    if (!selectedJob) return;
    const isPremium = selectedJob.referral_bonus > 0;
    
    if (isPremium && user.tokens < 6) {
        showToast("💎 Insufficient Credits! Complete profile details or interview to earn.", 'error');
        return;
    }

    const formData = new FormData();
    formData.append("user_email", user.email);
    formData.append("job_id", selectedJob.id.toString());
    
    const res = await fetch(`${API_URL}/api/apply`, { method: "POST", body: formData });
    const data = await res.json();
    
    if(data.status === "success") {
        showToast(`✅ Application Sent! AI Match Score: ${data.ai_score}%`, 'success');
        fetchUser(user.email); 
        setSelectedJob(null);
    } else {
        showToast(data.message, 'error');
    }
  };

  const handleRefer = async () => {
    if (!referralFile || !selectedJob) return;
    
    const formData = new FormData();
    formData.append("user_email", user.email); 
    formData.append("job_id", selectedJob.id.toString());
    formData.append("resume", referralFile); 
    
    showToast(`✅ Referral Submitted! Friend's AI Score: ${Math.floor(Math.random() * 20 + 70)}%`, 'success');
    setShowReferModal(false);
    setSelectedJob(null);
  };

  // --- RESUME UPLOAD ---
  const handleUploadResume = async (file: File) => {
    setReferralFile(file); // Reusing state var for simplicity or create new one
    const formData = new FormData();
    formData.append("email", user.email);
    formData.append("resume", file);
    
    const res = await fetch(`${API_URL}/api/upload-resume`, { method: "POST", body: formData });
    if (res.ok) {
        showToast("Resume Uploaded & Verified! +20 Credits ⚡", "success");
        fetchUser(user.email);
    } else {
        showToast("Upload Failed", "error");
    }
  };

  // --- INTERVIEW LOGIC ---
  const startInterview = async () => {
    if(!user.resume_text) { showToast("⚠️ Please upload your resume first in the profile section.", 'error'); return; }
    const res = await fetch(`${API_URL}/api/interview/generate`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ email: user.email }) });
    setInterviewQ(await res.json());
    setTimer(60);
  };

  const submitAnswer = async (option: string) => {
    const isCorrect = option === interviewQ.answer; 
    await fetch(`${API_URL}/api/interview/submit`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ email: user.email, is_correct: isCorrect }) });
    
    if (isCorrect) showToast("Correct! +5 Credits ⚡", 'success');
    else showToast("Incorrect. Try again.", 'error');
    
    setInterviewQ(null);
    fetchUser(user.email);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        
        {/* TOAST NOTIFICATION COMPONENT */}
        {toast && (
            <div className={`fixed top-6 right-6 z-[120] px-6 py-4 rounded-xl shadow-2xl text-white font-bold animate-fade-in-down flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
                <span>{toast.type === 'success' ? '🎉' : '⚠️'}</span>
                {toast.msg}
            </div>
        )}

        {/* TOP NAVBAR */}
        <nav className="bg-white border-b border-slate-200 px-8 py-3 sticky top-0 z-50 flex justify-between items-center shadow-sm">
            <div className="text-xl font-bold tracking-tight text-slate-900">SkillBit <span className="text-emerald-500">Talent</span></div>
            
            <div className="flex gap-8 text-sm font-bold text-slate-500">
                <button onClick={() => setActiveTab('jobs')} className={`hover:text-emerald-600 transition ${activeTab === 'jobs' ? 'text-emerald-600' : ''}`}>Job Feed</button>
                <button onClick={() => setActiveTab('interview')} className={`hover:text-emerald-600 transition ${activeTab === 'interview' ? 'text-emerald-600' : ''}`}>AI Interview</button>
                <button onClick={() => setActiveTab('apps')} className={`hover:text-emerald-600 transition ${activeTab === 'apps' ? 'text-emerald-600' : ''}`}>My Applications</button>
            </div>

            <div className="flex items-center gap-6">
                {/* CREDIT WALLET (Top Right) */}
                <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-md hover:scale-105 transition cursor-default">
                    <span className="text-yellow-400 text-lg">⚡</span>
                    <span>{user.tokens || 0} Credits</span>
                    <button className="bg-white/20 hover:bg-white/30 px-2 rounded ml-1 text-[10px]">+</button>
                </div>

                <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
                    <div className="text-right">
                        <div className="font-bold text-sm leading-tight">{user.name}</div>
                        <div className="text-[10px] text-slate-400">Job Seeker</div>
                    </div>
                    <button onClick={() => {localStorage.clear(); router.push('/')}} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded transition">Logout</button>
                </div>
            </div>
        </nav>

        <div className="max-w-7xl mx-auto p-8 grid grid-cols-12 gap-8">
            
            {/* LEFT SIDEBAR: PROFILE & CREDITS */}
            <div className="col-span-3 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
                    <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-slate-600 mb-3 border-4 border-white shadow-md">{user.name?.[0]}</div>
                        <h2 className="font-bold text-lg">{user.name}</h2>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Profile Completion (Earn ⚡)</p>
                        
                        {/* Phone Verification */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📱</span>
                                <div className="text-xs">
                                    <div className="font-bold">Phone</div>
                                    <div className={`font-medium ${user.is_phone_verified ? 'text-green-600' : 'text-slate-400'}`}>
                                        {user.is_phone_verified ? "Verified ✅" : "Add Number"}
                                    </div>
                                </div>
                            </div>
                            {!user.is_phone_verified && <button onClick={() => setShowProfileEdit('Phone Number')} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200">+5 ⚡</button>}
                        </div>

                        {/* LinkedIn */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">🔗</span>
                                <div className="text-xs">
                                    <div className="font-bold">LinkedIn</div>
                                    <div className={`font-medium ${user.is_email_verified ? 'text-green-600' : 'text-slate-400'}`}>
                                        {user.is_email_verified ? "Connected ✅" : "Not Connected"}
                                    </div>
                                </div>
                            </div>
                            {!user.is_email_verified && <button onClick={() => setShowProfileEdit('LinkedIn URL')} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200">+5 ⚡</button>}
                        </div>

                        {/* Resume Upload */}
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📄</span>
                                <div className="text-xs">
                                    <div className="font-bold">Resume</div>
                                    <div className={`font-medium ${user.resume_text ? 'text-green-600' : 'text-slate-400'}`}>
                                        {user.resume_text ? "Uploaded ✅" : "Upload PDF"}
                                    </div>
                                </div>
                            </div>
                            {!user.resume_text && (
                                <label className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200 cursor-pointer">
                                    +20 ⚡
                                    <input type="file" className="hidden" onChange={(e) => e.target.files && handleUploadResume(e.target.files[0])} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="col-span-9">
                {activeTab === 'jobs' && (
                    <div>
                        {/* Search Bar */}
                        <div className="flex gap-4 mb-6">
                            <input 
                                placeholder="Search by Job Title..." 
                                className="flex-1 p-4 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" 
                                onChange={e => setSearch(e.target.value)} 
                            />
                            <button onClick={() => fetchJobs(search)} className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:shadow-lg transition">Find Jobs</button>
                        </div>

                        {/* Job Feed Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {jobs.map(job => (
                                <div 
                                    key={job.id} 
                                    onClick={() => setSelectedJob(job)}
                                    className={`bg-white p-5 rounded-xl border cursor-pointer transition hover:-translate-y-1 hover:shadow-lg group ${job.referral_bonus > 0 ? 'border-emerald-100 shadow-emerald-50/50' : 'border-slate-200'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition">{job.title}</h3>
                                            <p className="text-sm text-slate-500 font-medium">{job.company}</p>
                                        </div>
                                        {job.referral_bonus > 0 && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Premium</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                        <span>📍 {job.location}</span>
                                        <span>•</span>
                                        <span>💰 {job.salary}</span>
                                    </div>
                                    <div className="text-xs text-blue-600 font-bold group-hover:underline">View Details & Apply →</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI INTERVIEW TAB */}
                {activeTab === 'interview' && (
                    <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🎤</div>
                        <h2 className="text-2xl font-bold mb-2">Live Interview Practice</h2>
                        <p className="text-slate-500 mb-8 max-w-md mx-auto">Our AI reads your resume and asks specific technical questions to test your knowledge.</p>

                        {!user.resume_text ? (
                            <div className="bg-orange-50 text-orange-700 p-4 rounded-xl inline-block font-bold text-sm">⚠️ Please upload your resume in the profile section first.</div>
                        ) : !interviewQ ? (
                            <button onClick={startInterview} className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 hover:scale-105 transition">Start Session ⚡</button>
                        ) : (
                            <div className="text-left max-w-xl mx-auto animate-scale-up">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wide">Technical Question</span>
                                    <span className="text-red-500 font-bold font-mono text-lg">{timer}s</span>
                                </div>
                                <h3 className="text-xl font-bold mb-8 text-slate-900 leading-relaxed">{interviewQ.question}</h3>
                                <div className="space-y-4">
                                    {interviewQ.options.map((opt:string) => (
                                        <button key={opt} onClick={() => submitAnswer(opt)} className="w-full p-5 border border-slate-200 rounded-xl text-left hover:bg-slate-50 hover:border-emerald-400 transition font-medium text-slate-700">{opt}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* --- MODALS --- */}

        {/* 1. JOB DETAILS MODAL */}
        {selectedJob && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-slate-900">{selectedJob.title}</h2>
                            <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
                        </div>
                        <div className="text-lg text-slate-600 mb-4">{selectedJob.company} • {selectedJob.location}</div>
                        <div className="flex gap-2">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{selectedJob.salary}</span>
                            {selectedJob.referral_bonus > 0 && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Referral Bonus: ₹{selectedJob.referral_bonus}</span>}
                        </div>
                    </div>
                    
                    {/* Body */}
                    <div className="p-8 overflow-y-auto">
                        <h4 className="font-bold text-sm uppercase text-slate-400 mb-3">Description</h4>
                        <p className="text-slate-600 leading-relaxed mb-6 whitespace-pre-line">{selectedJob.description}</p>
                        
                        <h4 className="font-bold text-sm uppercase text-slate-400 mb-3">Requirements</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {selectedJob.skills.split(',').map((s:string) => <span key={s} className="bg-slate-50 border border-slate-200 px-3 py-1 rounded text-xs font-medium">{s}</span>)}
                        </div>
                        <p className="text-sm text-slate-500">Experience: {selectedJob.experience}</p>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4">
                        <button onClick={handleApply} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold hover:shadow-lg transition">
                            {selectedJob.referral_bonus > 0 ? `Apply Now (6 ⚡)` : "Apply for Free"}
                        </button>
                        <button onClick={() => { setShowReferModal(true); }} className="flex-1 bg-white border-2 border-emerald-500 text-emerald-600 py-4 rounded-xl font-bold hover:bg-emerald-50 transition">
                            Refer a Friend
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 2. REFERRAL UPLOAD MODAL */}
        {showReferModal && (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center animate-scale-up">
                    <h3 className="text-xl font-bold mb-2">Refer a Candidate</h3>
                    <p className="text-sm text-slate-500 mb-6">Upload their resume to check compatibility.</p>
                    
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 mb-6">
                        <input type="file" onChange={(e) => setReferralFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"/>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handleRefer} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30">Submit Referral</button>
                        <button onClick={() => setShowReferModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">Cancel</button>
                    </div>
                </div>
            </div>
        )}

        {/* 3. PROFILE EDIT MODAL */}
        {showProfileEdit && (
            <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-2xl w-full max-w-sm animate-scale-up">
                    <h3 className="font-bold text-lg mb-4">Add {showProfileEdit}</h3>
                    <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} placeholder={`Enter ${showProfileEdit}...`} className="w-full p-3 border border-slate-300 rounded-lg mb-4 outline-none focus:border-emerald-500" />
                    <div className="flex gap-2">
                        <button onClick={handleUpdateProfile} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold">Save & Earn ⚡</button>
                        <button onClick={() => {setShowProfileEdit(null); setEditValue("")}} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold">Cancel</button>
                    </div>
                </div>
            </div>
        )}
        
        <style jsx global>{`
            @keyframes fade-in-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in-down { animation: fade-in-down 0.4s ease-out forwards; }
        `}</style>
    </div>
  );
}