import os
import sqlite3
import json
import ssl
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from dotenv import load_dotenv
import google.generativeai as genai
import pypdf
import random

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-flash-latest')

app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_NAME = "skillbit_revenue.db"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB SCHEMA ---
def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS users 
                     (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, name TEXT, 
                      wallet_balance INTEGER DEFAULT 0, tokens INTEGER DEFAULT 0, 
                      company TEXT, designation TEXT, resume_text TEXT,
                      is_phone_verified INTEGER DEFAULT 0, is_email_verified INTEGER DEFAULT 0)''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS jobs 
                     (id INTEGER PRIMARY KEY, title TEXT, company TEXT, location TEXT, salary TEXT, 
                      description TEXT, experience TEXT, skills TEXT, referral_bonus INTEGER DEFAULT 0, 
                      recruiter_email TEXT, posted_date TEXT)''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS applications 
                     (id INTEGER PRIMARY KEY, job_id INTEGER, user_email TEXT, referrer_email TEXT, 
                      job_title TEXT, company TEXT, status TEXT, date TEXT, ai_score INTEGER)''')
        conn.commit()
init_db()

# --- MODELS ---
def get_password_hash(password): return pwd_context.hash(password[:70])
def verify_password(plain, hashed): return pwd_context.verify(plain[:70], hashed)

class UserSignup(BaseModel): email: str; password: str; role: str; name: str; company: str = ""; designation: str = ""
class UserLogin(BaseModel): email: str; password: str
class JobPost(BaseModel): title: str; company: str; location: str; salary: str; description: str; experience: str; skills: str; referral_bonus: int; recruiter_email: str
class UpdateStatus(BaseModel): id: int; status: str
class InterviewRequest(BaseModel): email: str
class InterviewSubmit(BaseModel): email: str; is_correct: bool
class ReferRequest(BaseModel): user_email: str; job_id: int; friend_email: str; friend_name: str

# --- AUTH ROUTES ---
@app.post("/api/signup")
def signup(u: UserSignup):
    try:
        with sqlite3.connect(DB_NAME) as conn:
            c = conn.cursor()
            c.execute("INSERT INTO users (email, password, role, name, tokens, company, designation) VALUES (?, ?, ?, ?, 50, ?, ?)", 
                      (u.email, get_password_hash(u.password), u.role, u.name, u.company, u.designation))
            conn.commit()
        return {"status": "success"}
    except: return {"status": "error", "message": "Email exists"}

@app.post("/api/login")
def login(u: UserLogin):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (u.email,))
        user = c.fetchone()
    if user and verify_password(u.password, user['password']):
        return {"status": "success", "user": dict(user)}
    return {"status": "error", "message": "Invalid Credentials"}

@app.get("/api/user/{email}")
def get_user_stats(email: str):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        return dict(c.fetchone())

# --- RECRUITER ROUTES ---
@app.post("/api/jobs")
def post_job(job: JobPost):
    date = datetime.now().strftime("%Y-%m-%d")
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        c.execute("""INSERT INTO jobs (title, company, location, salary, description, experience, skills, referral_bonus, recruiter_email, posted_date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (job.title, job.company, job.location, job.salary, job.description, job.experience, job.skills, job.referral_bonus, job.recruiter_email, date))
        conn.commit()
    return {"status": "success"}

@app.put("/api/jobs/{id}")
def edit_job(id: int, job: JobPost):
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        c.execute("""UPDATE jobs SET title=?, location=?, salary=?, description=?, experience=?, skills=?, referral_bonus=? 
                     WHERE id=?""",
                  (job.title, job.location, job.salary, job.description, job.experience, job.skills, job.referral_bonus, id))
        conn.commit()
    return {"status": "success"}

@app.delete("/api/jobs/{id}")
def delete_job(id: int):
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        c.execute("DELETE FROM jobs WHERE id=?", (id,))
        conn.commit()
    return {"status": "success"}

@app.get("/api/recruiter/jobs/{email}")
def get_recruiter_jobs(email: str):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM jobs WHERE recruiter_email = ? ORDER BY id DESC", (email,))
        return c.fetchall()

@app.get("/api/recruiter/candidates/{email}")
def get_candidates(email: str):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""SELECT a.*, j.referral_bonus FROM applications a 
                     JOIN jobs j ON a.job_id = j.id 
                     WHERE j.recruiter_email = ? ORDER BY a.id DESC""", (email,))
        return c.fetchall()

@app.put("/api/applications/status")
def update_status(req: UpdateStatus):
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        c.execute("UPDATE applications SET status = ? WHERE id = ?", (req.status, req.id))
        conn.commit()
    return {"status": "success"}

# --- USER ROUTES ---
@app.post("/api/upload-resume")
async def upload_resume(email: str = Form(...), resume: UploadFile = File(...)):
    try:
        pdf_reader = pypdf.PdfReader(resume.file)
        text = "".join([page.extract_text() for page in pdf_reader.pages])[:5000]
        with sqlite3.connect(DB_NAME) as conn:
            c = conn.cursor()
            c.execute("UPDATE users SET resume_text = ?, tokens = tokens + 20 WHERE email = ?", (text, email))
            conn.commit()
        return {"status": "success"}
    except: return {"status": "error", "message": "Failed"}

@app.post("/api/interview/generate")
def generate_interview(req: InterviewRequest):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT resume_text FROM users WHERE email=?", (req.email,))
        user = c.fetchone()
        
    context = user['resume_text'] if user and user['resume_text'] else "General Software Engineering"
    
    try:
        prompt = f"""Based on resume: "{context[:500]}...", generate 1 tough technical multiple-choice question.
        Return JSON: {{'question': '...', 'options': ['A', 'B', 'C', 'D'], 'answer': 'Full Answer Text'}}"""
        res = model.generate_content(prompt)
        text = res.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except:
        return {"question": "What is the complexity of Binary Search?", "options": ["O(n)", "O(log n)", "O(1)", "O(n^2)"], "answer": "O(log n)"}

@app.post("/api/interview/submit")
def submit_interview(req: InterviewSubmit):
    msg = "Incorrect."
    with sqlite3.connect(DB_NAME) as conn:
        c = conn.cursor()
        if req.is_correct:
            c.execute("UPDATE users SET tokens = tokens + 5 WHERE email = ?", (req.email,))
            msg = "Correct! +5 Credits"
        conn.commit()
    return {"status": "success", "message": msg}

@app.post("/api/apply")
async def apply_for_job(user_email: str = Form(...), job_id: int = Form(...)):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
        job = c.fetchone()
        
        cost = 6 if job['referral_bonus'] > 0 else 0
        c.execute("SELECT tokens FROM users WHERE email=?", (user_email,))
        if c.fetchone()[0] < cost: return {"status": "error", "message": "Insufficient Credits"}
        
        c.execute("UPDATE users SET tokens = tokens - ? WHERE email=?", (cost, user_email))
        date = datetime.now().strftime("%Y-%m-%d")
        c.execute("INSERT INTO applications (job_id, user_email, job_title, company, status, date, ai_score) VALUES (?, ?, ?, ?, 'Received', ?, 85)",
                  (job_id, user_email, job['title'], job['company'], date))
        conn.commit()
    return {"status": "success", "message": "Application Sent!"}

@app.get("/api/jobs")
def get_jobs(search: str = ""):
    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        if search:
            query = f"%{search}%"
            c.execute("SELECT * FROM jobs WHERE title LIKE ? OR company LIKE ? ORDER BY id DESC", (query, query))
        else:
            c.execute("SELECT * FROM jobs ORDER BY id DESC")
        return c.fetchall()

@app.get("/api/news")
def get_news():
    return [{"title": "Tech hiring surge in India", "time": "1h ago"}, {"title": "AI salaries jump 20%", "time": "3h ago"}, {"title": "Google expands in Hyderabad", "time": "5h ago"}]