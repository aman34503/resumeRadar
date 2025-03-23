import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Card } from 'react-bootstrap';
import '../styles/index.css';


const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


const Login = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        navigate('/dashboard');
      }
    };

    checkSession();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error('Error logging in:', error.message);
  };

  return (
    <Container className="login-container">
      <Card className="text-center shadow-lg p-4">
        <Card.Body>
          <h2 className="mb-4">Welcome to ResumeRadar</h2>
          <p>Scan resumes and generate smart interview questions instantly!</p>
          <Button variant="primary" onClick={handleGoogleLogin}>
            Login with Google
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
