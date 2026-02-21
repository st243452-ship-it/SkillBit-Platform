import os
import json
import random
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from dotenv import load_dotenv
import google.generativeai as genai
import pypdf

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB CONNECTION ---
def get_conn():
    # Connects to Render's Postgres URL
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    if not DATABASE_URL:
        print("Waiting for DATABASE_URL...")
        return
    with get_conn() as conn:
        with conn.cursor() as c:
            # Note: Postgres uses SERIAL for auto-incrementing IDs
            c.execute('''CREATE TABLE IF NOT EXISTS users 
                         (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, name TEXT, 
                          tokens INTEGER DEFAULT 50, company TEXT, designation TEXT, resume_text TEXT,
                          is_phone_verified INTEGER DEFAULT 0, is_email_verified INTEGER DEFAULT 0)''')
            
            c.execute('''CREATE TABLE IF NOT EXISTS jobs 
                         (id SERIAL PRIMARY KEY, title TEXT, company TEXT, location TEXT, salary TEXT, 
                          description TEXT, experience TEXT, skills TEXT, referral_bonus INTEGER DEFAULT 0, 
                          recruiter_email TEXT, posted_date TEXT)''')
            
            c.execute('''CREATE TABLE IF NOT EXISTS applications 
                         (id SERIAL PRIMARY KEY, job_id INTEGER, user_email TEXT, referrer_email TEXT, 
                          job_title TEXT, company TEXT, status TEXT, date TEXT, ai_score INTEGER)''')
        conn.commit()

# Initialize tables on startup
try:
    init_db()
except Exception as e:
    print(f"DB Init Error: {e}")

# --- UTILS ---
def get_password_hash(password): return pwd_context.hash(password)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

# --- MODELS ---
class UserSignup(BaseModel): email: str; password: str; role: str; name: str; company: str = ""; designation: str = ""
class UserLogin(BaseModel): email: str; password: str
class JobPost(BaseModel): title: str; company: str; location: str; salary: str; description: str; experience: str; skills: str; referral_bonus: int; recruiter_email: str
class UpdateStatus(BaseModel): id: int; status: str
class InterviewRequest(BaseModel): email: str
class InterviewSubmit(BaseModel): email: str; is_correct: bool

# --- AUTH ROUTES ---
@app.post("/api/signup")
def signup(u: UserSignup):
    try:
        with get_conn() as conn:
            with conn.cursor() as c:
                # Postgres uses %s instead of ? for parameters
                c.execute("INSERT INTO users (email, password, role, name, tokens, company, designation) VALUES (%s, %s, %s, %s, 50, %s, %s)", 
                          (u.email, get_password_hash(u.password), u.role, u.name, u.company, u.designation))
            conn.commit()
        return {"status": "success"}
    except Exception as e: 
        return {"status": "error", "message": "Email exists"}

@app.post("/api/login")
def login(u: UserLogin):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT * FROM users WHERE email = %s", (u.email,))
            user = c.fetchone()
    if user and verify_password(u.password, user['password']):
        return {"status": "success", "user": dict(user)}
    return {"status": "error", "message": "Invalid Credentials"}

@app.get("/api/user/{email}")
def get_user_stats(email: str):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT * FROM users WHERE email = %s", (email,))
            return dict(c.fetchone())

# --- RECRUITER ROUTES ---
@app.post("/api/jobs")
def post_job(job: JobPost):
    date = datetime.now().strftime("%Y-%m-%d")
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("""INSERT INTO jobs (title, company, location, salary, description, experience, skills, referral_bonus, recruiter_email, posted_date) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                      (job.title, job.company, job.location, job.salary, job.description, job.experience, job.skills, job.referral_bonus, job.recruiter_email, date))
        conn.commit()
    return {"status": "success"}

@app.put("/api/jobs/{id}")
def edit_job(id: int, job: JobPost):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("""UPDATE jobs SET title=%s, location=%s, salary=%s, description=%s, experience=%s, skills=%s, referral_bonus=%s 
                         WHERE id=%s""",
                      (job.title, job.location, job.salary, job.description, job.experience, job.skills, job.referral_bonus, id))
        conn.commit()
    return {"status": "success"}

@app.delete("/api/jobs/{id}")
def delete_job(id: int):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("DELETE FROM jobs WHERE id=%s", (id,))
        conn.commit()
    return {"status": "success"}

@app.get("/api/recruiter/jobs/{email}")
def get_recruiter_jobs(email: str):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT * FROM jobs WHERE recruiter_email = %s ORDER BY id DESC", (email,))
            return c.fetchall()

@app.get("/api/recruiter/candidates/{email}")
def get_candidates(email: str):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("""SELECT a.*, j.referral_bonus FROM applications a 
                         JOIN jobs j ON a.job_id = j.id 
                         WHERE j.recruiter_email = %s ORDER BY a.id DESC""", (email,))
            return c.fetchall()

@app.put("/api/applications/status")
def update_status(req: UpdateStatus):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("UPDATE applications SET status = %s WHERE id = %s", (req.status, req.id))
        conn.commit()
    return {"status": "success"}

# --- USER ROUTES ---
@app.get("/api/user/applications/{email}")
def get_user_applications(email: str):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT * FROM applications WHERE user_email = %s ORDER BY id DESC", (email,))
            return c.fetchall()

@app.post("/api/upload-resume")
async def upload_resume(email: str = Form(...), resume: UploadFile = File(...)):
    try:
        pdf_reader = pypdf.PdfReader(resume.file)
        text = "".join([page.extract_text() for page in pdf_reader.pages])[:5000]
        with get_conn() as conn:
            with conn.cursor() as c:
                c.execute("UPDATE users SET resume_text = %s, tokens = tokens + 20 WHERE email = %s", (text, email))
            conn.commit()
        return {"status": "success"}
    except: return {"status": "error", "message": "Failed"}

@app.post("/api/interview/generate")
def generate_interview(req: InterviewRequest):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT resume_text FROM users WHERE email=%s", (req.email,))
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
    with get_conn() as conn:
        with conn.cursor() as c:
            if req.is_correct:
                c.execute("UPDATE users SET tokens = tokens + 5 WHERE email = %s", (req.email,))
                msg = "Correct! +5 Credits"
        conn.commit()
    return {"status": "success", "message": msg}

@app.post("/api/apply")
async def apply_for_job(user_email: str = Form(...), job_id: int = Form(...)):
    with get_conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT * FROM jobs WHERE id=%s", (job_id,))
            job = c.fetchone()
            
            cost = 6 if job['referral_bonus'] > 0 else 0
            c.execute("SELECT tokens FROM users WHERE email=%s", (user_email,))
            user_tokens = c.fetchone()['tokens']
            
            if user_tokens < cost: return {"status": "error", "message": "Insufficient Credits"}
            
            c.execute("UPDATE users SET tokens = tokens - %s WHERE email=%s", (cost, user_email))
            date = datetime.now().strftime("%Y-%m-%d")
            ai_score = random.randint(70, 95)
            
            c.execute("INSERT INTO applications (job_id, user_email, job_title, company, status, date, ai_score) VALUES (%s, %s, %s, %s, 'Received', %s, %s)",
                      (job_id, user_email, job['title'], job['company'], date, ai_score))
        conn.commit()
    return {"status": "success", "message": "Application Sent!", "ai_score": ai_score}

@app.get("/api/jobs")
def get_jobs(search: str = ""):
    with get_conn() as conn:
        with conn.cursor() as c:
            if search:
                query = f"%{search}%"
                # Postgres uses ILIKE for case-insensitive search
                c.execute("SELECT * FROM jobs WHERE title ILIKE %s OR company ILIKE %s ORDER BY id DESC", (query, query))
            else:
                c.execute("SELECT * FROM jobs ORDER BY id DESC")
            return c.fetchall()