import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Container, Row, Col, Button, Form, ListGroup, Spinner } from 'react-bootstrap';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/index.css';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
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

  const response = await axios.post('http://localhost:5000/process-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        const { questions, fileUrl } = response.data;
        setQuestions(questions);
        setFileUrl(fileUrl);
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
    <Container fluid>
      <Row>
        <Col md={3} className="sidebar bg-dark text-white p-4">
          <h4>Welcome, {user?.email}</h4>
          <Button variant="danger" onClick={handleLogout} className="mt-3">
            Logout
          </Button>
        </Col>
        <Col md={9} className="content p-5">
          <h2>Upload Your Resume</h2>
          <Form.Group className="mb-3">
            <Form.Control type="file" accept=".pdf" onChange={handleFileChange} />
          </Form.Group>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? <Spinner animation="border" size="sm" /> : 'Generate Questions'}
          </Button>

          {fileUrl && (
            <p className="mt-3">
              📄 File Uploaded: <a href={fileUrl} target="_blank" rel="noopener noreferrer">View Uploaded Resume</a>
            </p>
          )}

          {questions.length > 0 && (
            <div className="mt-5">
              <h3>Generated Interview Questions:</h3>
              <ListGroup>
                {questions.map((question, index) => (
                  <ListGroup.Item key={index}>{question}</ListGroup.Item>
                ))}
              </ListGroup>
              <Button onClick={downloadPdf} className="mt-3">
                Download Questions as PDF
              </Button>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
