import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Container, Button, Form, Spinner } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/index.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
      else navigate('/');
    };

    fetchSession();
  }, [navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file || !user) {
      alert('Please upload a file and ensure you are logged in.');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('resume', file);

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: `📄 Uploaded resume: ${file.name}` },
      ]);

      const response = await axios.post(`${apiUrl}/process-resume/api`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        const { questions, fileUrl } = response.data;
        setQuestions(questions);
        setFileUrl(fileUrl);

        const formattedQuestions = questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: formattedQuestions },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) navigate('/');
  };

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
    <div className="dashboard-container">
      {/* Header Section */}
      <div className="header-container">
        <div className="greeting-text">
          👋 Hello, {user?.email || 'User'}
        </div>
        <Button variant="outline-dark" onClick={handleLogout} className="btn-logout">
          Logout
        </Button>
      </div>

      {/* Main Content */}
      <Container className="d-flex justify-content-center align-items-center flex-grow-1">
        <div className="chat-container">
          <div className="chat-header mb-4 text-center">
            <h5 className="text-light">🚀 Upload Your Resume to Get Interview Questions</h5>
            <p className="text-secondary">Powered by AI to generate relevant interview questions based on your skills.</p>
          </div>

          {/* Chat-like messages */}
          <div className="chat-box">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                {msg.content.split('\n').map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Upload Resume Section */}
          <Form.Group className="mb-3">
            <Form.Control
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="custom-file-input"
            />
          </Form.Group>
          <Button onClick={handleSubmit} disabled={isLoading} variant="primary">
            {isLoading ? <Spinner animation="border" size="sm" /> : 'Generate Questions'}
          </Button>

          {fileUrl && (
            <p className="mt-3 text-light">
              📄 File Uploaded: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-info">View Uploaded Resume</a>
            </p>
          )}

          {/* Download PDF Button */}
          {questions.length > 0 && (
            <Button onClick={downloadPdf} className="mt-3 w-100 btn-download">
              Download Questions as PDF
            </Button>
          )}
        </div>
      </Container>
    </div>
  );
};

export default Dashboard;
