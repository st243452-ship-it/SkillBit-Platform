"use client";
import React, { useState, useEffect } from 'react';
import { API_URL } from '@/utils/api';

export default function QuizPage() {
  const [topic, setTopic] = useState("Python");
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [stats, setStats] = useState({ wallet_balance: 0, diamonds: 0 });
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState(50);
  const [paymentMsg, setPaymentMsg] = useState("");

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const email = localStorage.getItem("user_email");
    if(email) {
        const res = await fetch(`${API_URL}/api/user/${email}`);
        const data = await res.json();
        setStats(data);
    }
  }

  const handleAddMoney = async () => {
    const email = localStorage.getItem("user_email");
    await fetch(`${API_URL}/api/wallet/add`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount: amountToAdd })
    });
    setShowAddMoney(false); fetchStats();
  };

  const generateQuiz = async () => {
    setLoading(true); setQuiz(null); setResult(null); setSelectedOption(null); setPaymentMsg("");
    
    const email = localStorage.getItem("user_email");
    const res = await fetch(`${API_URL}/api/quiz/generate`, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, topic })
    });
    const data = await res.json();
    
    if (data.status === "payment_required") {
        setPaymentMsg(data.message);
        setShowAddMoney(true); // Open wallet modal automatically
    } else {
        setQuiz(data);
        fetchStats(); // Update balance if deducted
    }
    setLoading(false);
  };

  const checkAnswer = async (option: string) => {
    if(result) return;
    setSelectedOption(option);
    const isCorrect = option === quiz.answer;
    setResult(isCorrect ? "Correct" : "Wrong");
    
    const email = localStorage.getItem("user_email");
    await fetch(`${API_URL}/api/quiz/submit`, {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email, is_correct: isCorrect })
    });
    fetchStats();
  };

  return (
    <div className="max-w-3xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border">
            <h1 className="text-2xl font-bold">Quiz Arena ⚔️</h1>
            <div className="flex gap-4">
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold">💎 {stats.diamonds}</div>
                <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-200" onClick={() => setShowAddMoney(true)}>
                    <span>💳 Wallet: ₹{stats.wallet_balance}</span>
                    <span className="text-[10px] bg-slate-300 px-1 rounded">+</span>
                </div>
            </div>
        </div>

        {/* ADD MONEY MODAL */}
        {showAddMoney && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl w-80 shadow-2xl animate-scale-up">
                    <h3 className="font-bold text-lg mb-4 text-center">Add Funds to Play</h3>
                    {paymentMsg && <p className="text-xs text-red-500 mb-4 text-center font-bold">{paymentMsg}</p>}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[30, 50, 100].map(amt => (
                            <button key={amt} onClick={() => setAmountToAdd(amt)} className={`py-2 rounded border font-bold ${amountToAdd === amt ? 'bg-slate-900 text-white' : 'border-slate-200'}`}>₹{amt}</button>
                        ))}
                    </div>
                    <button onClick={handleAddMoney} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Pay ₹{amountToAdd}</button>
                    <button onClick={() => setShowAddMoney(false)} className="w-full mt-2 text-slate-500 text-sm">Cancel</button>
                </div>
            </div>
        )}

        {!quiz && (
            <div className="bg-white p-10 rounded-2xl shadow-lg text-center">
                <h2 className="text-xl font-bold mb-4">Select Topic</h2>
                <div className="flex justify-center gap-4 mb-8">
                    {['Python', 'React', 'Data Science', 'Marketing'].map(t => (
                        <button key={t} onClick={() => setTopic(t)} className={`px-4 py-2 rounded-lg border transition ${topic === t ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>{t}</button>
                    ))}
                </div>
                <button onClick={generateQuiz} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-700 w-full max-w-xs">{loading ? "Loading..." : "Start Quiz"}</button>
            </div>
        )}

        {quiz && (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fade-in">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Topic: {topic}</span>
                <h3 className="text-xl font-bold text-slate-800 mb-6">{quiz.question}</h3>
                <div className="grid gap-3">
                    {(quiz.options || []).map((opt: string) => {
                        let btnClass = "p-4 rounded-xl border-2 text-left font-medium transition-all ";
                        if (result) {
                            if (opt === quiz.answer) btnClass += "bg-green-100 border-green-500 text-green-800 scale-105 shadow-md"; 
                            else if (opt === selectedOption && opt !== quiz.answer) btnClass += "bg-red-100 border-red-500 text-red-800 opacity-50"; 
                            else btnClass += "opacity-40 grayscale"; 
                        } else { btnClass += "border-slate-100 hover:border-blue-400 hover:bg-blue-50"; }
                        return <button key={opt} onClick={() => checkAnswer(opt)} className={btnClass} disabled={!!result}>{opt}</button>;
                    })}
                </div>
                {result && <div className="mt-8 text-center animate-bounce-in"><p className={`text-lg font-bold mb-4 ${result === "Correct" ? "text-green-600" : "text-red-500"}`}>{result === "Correct" ? "🎉 Correct! +1 Diamond 💎" : "❌ Wrong Answer"}</p><button onClick={generateQuiz} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800">Next Question →</button></div>}
            </div>
        )}
    </div>
  );
}