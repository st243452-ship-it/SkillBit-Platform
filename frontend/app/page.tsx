"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function LandingPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userRole, setUserRole] = useState<'user' | 'recruiter'>('user');
  const [formData, setFormData] = useState({ email: "", password: "", name: "", company: "", designation: "" });
  const [notification, setNotification] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const showToast = (msg: string, type: 'success'|'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? "/api/login" : "/api/signup";
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role: userRole === 'recruiter' ? 'Recruiter' : 'Job Seeker' })
      });
      const data = await res.json();
      
      if (data.status === "success") {
        showToast(authMode === 'login' ? "Welcome Back! 🚀" : "Account Created Successfully! 🎉", "success");
        if (authMode === 'login') {
            localStorage.setItem("user_email", data.user.email);
            localStorage.setItem("user_role", data.user.role);
            localStorage.setItem("user_name", data.user.name);
            setTimeout(() => {
                if (data.user.role === "Recruiter") router.push('/recruiter-dashboard');
                else router.push('/user-dashboard');
            }, 1000);
        } else {
            setAuthMode('login');
        }
      } else {
        showToast(data.message, "error");
      }
    } catch (err) { showToast("Server Error. Check connection.", "error"); }
  };

  return (
    <div className="min-h-screen flex font-sans bg-white selection:bg-blue-100">
      {/* TOAST NOTIFICATION */}
      {notification && (
          <div className={`fixed top-5 right-5 px-6 py-4 rounded-xl shadow-2xl z-50 text-white font-bold animate-slide-in flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
              <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
              {notification.msg}
          </div>
      )}

      {/* LEFT: TECH ANIMATION SIDE */}
      <div className="hidden lg:flex w-5/12 relative overflow-hidden bg-slate-900 text-white flex-col justify-between">
        
        {/* ANIMATED BACKGROUND IMAGE */}
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
                className="w-full h-full object-cover opacity-60 animate-ken-burns"
                alt="Tech Background"
            />
            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-blue-900/40 mix-blend-multiply"></div>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 p-16 h-full flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-lg">S</div>
                    <span className="text-2xl font-extrabold tracking-tight">SkillBit</span>
                </div>
                <p className="text-slate-300 text-sm font-medium tracking-wide opacity-80">Next-Gen Enterprise Hiring</p>
            </div>

            <div className="space-y-8">
                <blockquote className="text-3xl font-bold leading-tight drop-shadow-lg">
                    "Find the talent that <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">builds the future.</span>"
                </blockquote>
                
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Trusted by Industry Leaders</p>
                    <div className="flex gap-6 opacity-70 grayscale hover:grayscale-0 transition duration-500">
                        <span className="font-bold text-lg text-white">Google</span>
                        <span className="font-bold text-lg text-white">Microsoft</span>
                        <span className="font-bold text-lg text-white">Uber</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* RIGHT: LOGIN/SIGNUP FORM */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fade-in-up">
            
            {/* ROLE TOGGLE */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 relative">
                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${userRole === 'user' ? 'left-1.5' : 'left-[calc(50%+3px)]'}`}></div>
                <button onClick={() => setUserRole('user')} className={`flex-1 py-3 text-sm font-bold rounded-xl relative z-10 transition ${userRole === 'user' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Job Seeker</button>
                <button onClick={() => setUserRole('recruiter')} className={`flex-1 py-3 text-sm font-bold rounded-xl relative z-10 transition ${userRole === 'recruiter' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Recruiter</button>
            </div>

            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-slate-500 text-sm">
                    {userRole === 'recruiter' ? 'Access your enterprise dashboard.' : 'Start your professional journey.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {authMode === 'signup' && (
                    <>
                        {/* FIX: Text Color and Placeholder Color explicitly set */}
                        <div className="group">
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                required 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-900 focus:bg-white transition shadow-sm group-hover:border-slate-300" 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                            />
                        </div>
                        {userRole === 'recruiter' && (
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Company Name" required className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-600 focus:bg-white transition shadow-sm" onChange={e => setFormData({...formData, company: e.target.value})} />
                                <input type="text" placeholder="Designation" required className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-600 focus:bg-white transition shadow-sm" onChange={e => setFormData({...formData, designation: e.target.value})} />
                            </div>
                        )}
                    </>
                )}
                
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    required 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-900 focus:bg-white transition shadow-sm hover:border-slate-300" 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-900 focus:bg-white transition shadow-sm hover:border-slate-300" 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                />
                
                <button className={`w-full py-4 rounded-xl text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-1 transition duration-300 ${userRole === 'recruiter' ? 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/30' : 'bg-slate-900 shadow-slate-500/30'}`}>
                    {authMode === 'login' ? 'Login to Dashboard →' : 'Create Free Account →'}
                </button>
            </form>

            <div className="mt-8 flex items-center gap-4"><div className="h-px bg-slate-200 flex-1"></div><span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Or continue with</span><div className="h-px bg-slate-200 flex-1"></div></div>
            
            <button className="w-full mt-6 py-3.5 border border-slate-200 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition text-sm font-bold text-slate-700 shadow-sm">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google"/> 
                <span>Sign in with Google</span>
            </button>

            <p className="text-center mt-8 text-xs text-slate-500 font-medium">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="font-bold text-slate-900 hover:underline hover:text-blue-600 transition">
                    {authMode === 'login' ? 'Sign up for free' : 'Login here'}
                </button>
            </p>
        </div>
      </div>
      
      <style jsx global>{` 
        @keyframes ken-burns { 0% { transform: scale(1); } 100% { transform: scale(1.1); } } 
        .animate-ken-burns { animation: ken-burns 20s ease-out infinite alternate; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        @keyframes slide-in { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } } 
        .animate-slide-in { animation: slide-in 0.5s ease-out forwards; } 
      `}</style>
    </div>
  );
}