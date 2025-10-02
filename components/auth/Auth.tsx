

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import './Auth.css';
import KithaiLogo from '../AionLogo';


const Auth: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'resetPassword'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentMessage, setEmailSentMessage] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signUp' && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) {
          setEmailSentMessage(`We've sent a confirmation link to **${email}**. Please click the link to complete your registration.`);
          setEmailSent(true);
        }
      } else { // 'signIn'
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Supabase auth error:', err);
      if (err.message && err.message.includes('For security purposes')) {
        setError('Too many attempts. Please wait a minute before trying again.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Users will be redirected here after password reset
      });
      if (error) throw error;
      setEmailSentMessage(`If an account exists for **${email}**, a password reset link has been sent. Please check your inbox.`);
      setEmailSent(true);
    } catch (err: any) {
      console.error('Supabase reset password error:', err);
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      setEmailSentMessage(`A new confirmation link has been sent to **${email}**. Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error('Supabase resend error:', err);
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = (newMode: 'signIn' | 'signUp' | 'resetPassword') => {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setEmailSent(false);
  };

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <KithaiLogo className="auth-logo" />
          <h2 className="auth-title">Check your email</h2>
          <p className="auth-subtitle" dangerouslySetInnerHTML={{ __html: emailSentMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          <p className="auth-toggle">Didn't receive it? Check your spam folder or click to resend.</p>
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="auth-footer">
            <button onClick={handleResendConfirmation} type="button" className="auth-button" disabled={isLoading}>
              {isLoading ? (
                <><span className="icon sync">sync</span> Sending...</>
              ) : (
                <><span className="icon">send</span> Resend Link</>
              )}
            </button>
            <button onClick={() => handleToggleMode('signIn')} type="button" className="toggle-button">Back to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <KithaiLogo className="auth-logo" />
        
        {mode === 'signIn' && (
          <>
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to continue to Kithai</p>
            {error && <p className="error-message" role="alert">{error}</p>}
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="auth-input" required aria-label="Email Address" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="auth-input" required aria-label="Password" />
              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? (
                  <><span className="icon sync">sync</span> Signing In...</>
                ) : (
                  <><span className="icon">login</span> Sign In</>
                )}
              </button>
            </form>
            <div className="auth-footer">
              <p className="auth-toggle">
                No account?
                <button onClick={() => handleToggleMode('signUp')} type="button" className="toggle-button">Sign Up</button>
              </p>
              <button onClick={() => handleToggleMode('resetPassword')} type="button" className="link-button">Forgot Password?</button>
            </div>
          </>
        )}

        {mode === 'signUp' && (
          <>
            <h2 className="auth-title">Create an Account</h2>
            <p className="auth-subtitle">Get started with your AI assistant</p>
            {error && <p className="error-message" role="alert">{error}</p>}
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="auth-input" required aria-label="Email Address" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="auth-input" required aria-label="Password" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" className="auth-input" required aria-label="Confirm Password" />
              <button type="submit" className="auth-button" disabled={isLoading}>
                {isLoading ? (
                  <><span className="icon sync">sync</span> Creating Account...</>
                ) : (
                  <><span className="icon">person_add</span> Create Account</>
                )}
              </button>
            </form>
            <div className="auth-footer">
              <p className="auth-toggle">
                Have an account?
                <button onClick={() => handleToggleMode('signIn')} type="button" className="toggle-button">Sign In</button>
              </p>
            </div>
          </>
        )}

        {mode === 'resetPassword' && (
            <>
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">Enter your email to receive a reset link</p>
                {error && <p className="error-message" role="alert">{error}</p>}
                <form onSubmit={handlePasswordReset} className="auth-form">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="auth-input" required aria-label="Email Address" />
                    <button type="submit" className="auth-button" disabled={isLoading}>
                      {isLoading ? (
                        <><span className="icon sync">sync</span> Sending...</>
                      ) : (
                        <><span className="icon">send</span> Send Reset Link</>
                      )}
                    </button>
                </form>
                <div className="auth-footer">
                    <button onClick={() => handleToggleMode('signIn')} type="button" className="toggle-button">Back to Sign In</button>
                </div>
            </>
        )}

      </div>
    </div>
  );
};

export default Auth;