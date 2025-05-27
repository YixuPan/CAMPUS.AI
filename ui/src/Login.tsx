import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const ringRef = useRef<HTMLDivElement>(null);
  
  // Animation for the card only, ring remains 2D
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const card = document.querySelector('.login-card') as HTMLElement;
      if (!card) return;
      
      const cardRect = card.getBoundingClientRect();
      
      // Check if mouse is within the card bounds
      const isMouseOverCard = 
        e.clientX >= cardRect.left && 
        e.clientX <= cardRect.right && 
        e.clientY >= cardRect.top && 
        e.clientY <= cardRect.bottom;
      
      if (isMouseOverCard) {
        // Calculate mouse position relative to the card center
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const mouseX = e.clientX - cardCenterX;
        const mouseY = e.clientY - cardCenterY;
        
        // Calculate rotation with constraints for the card - fix the direction
        const cardRotateX = Math.max(-8, Math.min(8, mouseY * 0.01));
        const cardRotateY = Math.max(-8, Math.min(8, mouseX * 0.01)); // Remove the negative sign
        
        // Apply 3D effect to the card
        card.style.transform = `perspective(1000px) rotateX(${5 + cardRotateX}deg) rotateY(${cardRotateY}deg)`;
      } else {
        // Reset to default position when mouse is outside card
        card.style.transform = 'perspective(1000px) rotateX(5deg)';
      }
    };
    
    // Set initial rotation for the card
    const card = document.querySelector('.login-card') as HTMLElement;
    if (card) {
      card.style.transform = 'perspective(1000px) rotateX(5deg)';
    }
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Define positions for the feature items on the larger circle
  const positions = ['top', 'right', 'bottom', 'left'];

  // Create feature elements with longer bars and descriptions
  const features = [
    { 
      text: 'Attendance Analytics', 
      description: 'Track student participation and engagement patterns',
      color: '#64d2ff', 
      size: 1.0 
    },
    { 
      text: 'Campus Resources', 
      description: 'Book study rooms, labs, and campus facilities',
      color: '#ff7eb3', 
      size: 1.0 
    },
    { 
      text: 'Calendar Management', 
      description: 'Organize schedules, deadlines, and events',
      color: '#8e78ff', 
      size: 1.0 
    },
    { 
      text: 'Virtual TA Assistant', 
      description: 'Get instant help with coursework and questions',
      color: '#64dca8', 
      size: 1.0 
    }
  ];
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Backdoor login check
    if (email === '0' && password === '0') {
      console.log('🔐 Backdoor login detected');
      
      // Create a mock token for backdoor access
      const mockToken = 'backdoor_access_token_' + Date.now();
      localStorage.setItem('access_token', mockToken);
      
      // Navigate to app immediately
      navigate('/app');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting login with:', { email });
      
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      console.log('🔐 Login response:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 Login successful:', data);
        
        // Store the token
        localStorage.setItem('access_token', data.access_token);
        
        // Navigate to app
        navigate('/app');
      } else {
        const errorData = await response.json();
        console.error('🔐 Login failed:', errorData);
        setError(errorData.detail || 'Login failed');
      }
    } catch (error) {
      console.error('🔐 Network error:', error);
      setError('Network error: Unable to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <main className="login-content">
        <div className="login-centered-container" ref={ringRef}>
          {/* Orbiting ring with attached features */}
          <div 
            className="feature-orbit"
            style={{
              '--orbit-duration': '120s',
              '--feature-color': '#6a5fff',
              '--feature-color-rgb': '106, 95, 255'
            } as React.CSSProperties}
          >
            {/* Features attached to the ring */}
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`feature-item ${positions[index]}`}
                style={{
                  '--feature-color': feature.color,
                  '--feature-color-rgb': feature.color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')
                } as React.CSSProperties}
              >
                <div className="feature-content">
                  <div className="feature-title">{feature.text}</div>
                  <div className="feature-description">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Center Login Card */}
          <div className="login-card">
            <div className="login-form-container">
              <div className="login-brand">
                <h2>CampusSphere</h2>
                <p>Powered by Microsoft Azure</p>
              </div>
              
              <h1>Sign In</h1>
              <p className="login-subtitle">Access your dashboard</p>
              
              {error && (
                <div className="error-message" style={{
                  color: '#ff4757',
                  backgroundColor: '#ffe5e5',
                  padding: '10px',
                  borderRadius: '5px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  border: '1px solid #ffcdd2'
                }}>
                  {error}
                </div>
              )}
              
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Username</label>
                  <input
                    type="text"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-username"
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="form-options">
                  <div className="remember-me">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                    />
                    <label htmlFor="remember">Remember me</label>
                  </div>
                  <a href="#" className="forgot-password">Forgot password?</a>
                </div>
                
                <button 
                  type="submit" 
                  className={`login-button ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              
              <div className="login-alt">
                <p>Don't have an account? <a href="#">Contact IT Support</a></p>
                <div className="sso-options">
                  <p>Or sign in with</p>
                  <div className="sso-buttons">
                    <button className="sso-button microsoft">
                      <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0h11v11H0z" fill="#f25022"/>
                        <path d="M12 0h11v11H12z" fill="#7fba00"/>
                        <path d="M0 12h11v11H0z" fill="#00a4ef"/>
                        <path d="M12 12h11v11H12z" fill="#ffb900"/>
                      </svg>
                      <span>Microsoft</span>
                    </button>
                    <button className="sso-button google">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Google</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="login-footer">
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
          <a href="#">Help</a>
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} CampusSphere. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Login; 