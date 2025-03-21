# 🎯 **resumeRadar**  
**Scan Resumes, Generate Smart Interview Questions Instantly!**

**resumeRadar** is an AI-powered platform that scans resumes and generates tailored interview questions to help recruiters and candidates prepare effectively. Upload a resume, and let our system analyze and generate insightful, role-specific interview questions. It securely stores resumes using **Supabase Storage**, extracts the content using **pdf-parse** and **OCR (Tesseract.js)**, and leverages **Hugging Face Zephyr-7B** to craft smart, technical interview questions.

---

## 🚀 **Key Features**
✅ Upload resumes in PDF format  
✅ Securely store resumes in **Supabase Storage**  
✅ Extract and analyze text using **pdf-parse** and **OCR for images**  
✅ Generate 10+ personalized interview questions using **Hugging Face Zephyr-7B**  
✅ View and manage resume analysis history  
✅ Export interview questions as a downloadable PDF  
✅ Responsive interface for mobile and desktop  

---

## 🛠️ **Tech Stack**
### 🎨 **Frontend**
- React.js (Vite)  
- Tailwind CSS  
- Supabase Auth for Google Sign-In  
- Axios for API integration  

### ⚙️ **Backend**
- Node.js & Express.js  
- Supabase Storage for file management  
- pdf-parse for extracting text  
- Tesseract.js for OCR (scanning images in PDFs)  
- Hugging Face API (Zephyr-7B Model) for generating questions  
- Supabase DB for storing processed data  

### 🗂️ **API & Libraries**
- Axios for API requests  
- dotenv for environment variables  
- pdf-parse & tesseract.js for PDF and image processing  
- Supabase SDK for storage and DB operations  

---

## 📚 **How It Works**
1. **Sign In** – Sign in with Google for a secure and seamless experience.  
2. **Upload Resume** – Upload your resume in PDF format.  
3. **Resume Analysis** –  
   - Extract text using `pdf-parse`.  
   - If no text is found, apply OCR via `tesseract.js`.  
4. **Generate Questions** – AI (Hugging Face) processes the resume text and generates 10+ role-specific interview questions.  
5. **Download Results** – Export generated questions as a downloadable PDF for review.  
6. **Track History** – View and manage previously analyzed resumes.  

---

## 📊 **Wireflow & Process Flow**

### ✅ **User Flow Diagram**
```mermaid
flowchart TD
    A[User Logs In] --> B{Upload Resume}
    B --> |Valid PDF| C[Extract Text from PDF]
    B --> |Invalid Format| D[Show Error Message]
    C --> E{Text Found?}
    E --> |Yes| F[Generate Interview Questions]
    E --> |No| G[Apply OCR with Tesseract.js]
    G --> H{OCR Successful?}
    H --> |Yes| F
    H --> |No| L[Show Extraction Error Message]
    L --> A

    F --> I[Display Generated Questions]
    I --> J{User Options}
    
    J --> |Download PDF| K[Generate and Download File]
    J --> |View History| M[Show Previous Resumes]
    J --> |New Upload| B
    J --> |Edit or Upload New Resume| B
    
    M --> N{Resume Selected?}
    N --> |Yes| O[View Previous Questions]
    N --> |No| P[Return to Dashboard]
    O --> J
    P --> J



