// Save as src/pages/AuthSuccess.jsx (React)
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess(){
  const navigate = useNavigate();

  useEffect(()=>{
    const hash = window.location.hash.replace(/^#/,'');
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (!token) {
      console.error("No access token in URL");
      navigate('/login');
      return;
    }
    localStorage.setItem('token', token);
    // optionally verify with /api/me then redirect
    fetch((process.env.REACT_APP_API_BASE_HOST || 'http://localhost:8000') + '/api/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => {
        if (!r.ok) throw new Error('verify failed');
        return r.json();
      })
      .then(user => {
        console.log('user', user);
        navigate('/');
      })
      .catch(err => {
        console.warn('verify failed', err);
        // if account needs completion:
        navigate('/complete-registration');
      });
  }, [navigate]);

  return <div style={{padding:20}}>Finalizing sign-in…</div>;
}
