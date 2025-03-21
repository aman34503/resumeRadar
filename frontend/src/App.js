import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { jsPDF } from 'jspdf';

// Initialize Supabase client
const supabaseUrl = 'https://krqicljcoyxwkwdgfdpf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycWljbGpjb3l4d2t3ZGdmZHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NzkwMzgsImV4cCI6MjA1NzM1NTAzOH0.I7zbDEH8noQNnog07nxQx7OFzYzbBqBbO0Q_hLCFgCQ';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');

  // ✅ Check if user is already logged in
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };

    fetchSession();

    // ✅ Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setUser(session.user);
      else setUser(null);
    });

    // ✅ Cleanup listener on unmount
    return () => subscription?.unsubscribe?.();
  }, []);

  // ✅ Handle file change
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // ✅ Handle resume submission
  const handleSubmit = async () => {
    if (!file || !user) {
      alert('Please upload a file and ensure you are logged in.');
      return;
    }

    try {
      setIsLoading(true);

      // ✅ Create a FormData object
      const formData = new FormData();
      formData.append('resume', file);

      console.log('Uploading file...');

      // ✅ Send file to backend
      const response = await axios.post('http://localhost:5000/process-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log('Backend response:', response);

      if (response.data) {
        const { questions, fileUrl } = response.data;
        if (questions) {
          setQuestions(questions);
          setFileUrl(fileUrl); // Set the Supabase file URL
          console.log('Questions:', questions);
        } else {
          throw new Error('Invalid response from the server');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.response) {
        alert(`Backend error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.message === 'Failed to fetch') {
        alert('Network error. Please check your internet connection.');
      } else {
        alert('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle Google login
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error('Error logging in:', error.message);
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
    else setUser(null);
  };

  // ✅ Download questions as PDF
  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Interview Questions Generated from Resume', 10, 10);

    questions.forEach((question, index) => {
      doc.text(`${index + 1}. ${question}`, 10, 20 + index * 10);
    });

    doc.save('interview-questions.pdf');
  };

  return (
    <div style={styles.container}>
      <h1>ResumeRadar - AI Interview Question Generator</h1>
      {user ? (
        <>
          <p>Welcome, <strong>{user.email}</strong>!</p>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          <button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Generate Questions'}
          </button>
          <button onClick={handleLogout}>Logout</button>

          {fileUrl && (
            <p>
              📄 File Uploaded: <a href={fileUrl} target="_blank" rel="noopener noreferrer">View Uploaded Resume</a>
            </p>
          )}

          {questions.length > 0 && (
            <>
              <h2>Generated Interview Questions:</h2>
              <ul>
                {questions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
              <button onClick={downloadPdf}>Download Questions as PDF</button>
            </>
          )}
        </>
      ) : (
        <button onClick={handleGoogleLogin}>Login with Google</button>
      )}
    </div>
  );
}

// ✅ Basic styles for better UI
const styles = {
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif'
  }
};

export default App;
