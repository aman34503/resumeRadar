import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist'; // Import pdfjs-dist for PDF rendering

// Set the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Initialize Supabase client
const supabaseUrl = 'https://krqicljcoyxwkwdgfdpf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycWljbGpjb3l4d2t3ZGdmZHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3NzkwMzgsImV4cCI6MjA1NzM1NTAzOH0.I7zbDEH8noQNnog07nxQx7OFzYzbBqBbO0Q_hLCFgCQ';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [user, setUser] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    // Fetch the current session
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    };

    fetchSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setUser(session.user);
      else setUser(null);
    });

    // Cleanup listener on unmount
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

const handleSubmit = async () => {
  if (!file || !user) {
    alert('Please upload a file and ensure you are logged in.');
    return;
  }

  try {
    // Create a FormData object
    const formData = new FormData();
    formData.append('resume', file); // Ensure the field name is 'resume'
console.log("HELOoooooooooooooo",formData);
    console.log('Sending request to backend...');

    // Send the file to the backend
    const response = await axios.post('http://localhost:5000/process-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }, // Set the correct content type
    });

    console.log('Backend response:', response);

    if (response.data && response.data.questions) {
      setQuestions(response.data.questions);
      console.log('Questions:', response.data.questions);
    } else {
      throw new Error('Invalid response from the server');
    }
  } catch (error) {
    console.error('Error:', error);
    if (error.response) {
      // Handle backend errors
      console.error('Backend error:', error.response.data);
      alert(`Backend error: ${error.response.data.error || 'Unknown error'}`);
    } else if (error.message === 'Failed to fetch') {
      alert('Network error. Please check your internet connection.');
    } else {
      alert('An error occurred. Please try again.');
    }
  }
};

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error('Error logging in:', error);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.text('Interview Questions', 10, 10);
    questions.forEach((question, index) => {
      doc.text(`${index + 1}. ${question}`, 10, 20 + (index * 10));
    });
    doc.save('interview-questions.pdf');
  };

  return (
    <div>
      <h1>Upload Your Resume</h1>
      {user ? (
        <>
          <p>Welcome, {user.email}!</p>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          <button onClick={handleSubmit}>Generate Questions</button>
          <button onClick={handleLogout}>Logout</button>
          {questions.length > 0 && (
            <button onClick={downloadPdf}>Download Questions as PDF</button>
          )}
        </>
      ) : (
        <button onClick={handleGoogleLogin}>Login with Google</button>
      )}

      <div>
        <h2>Interview Questions:</h2>
        <ul>
          {questions.map((question, index) => (
            <li key={index}>{question}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;