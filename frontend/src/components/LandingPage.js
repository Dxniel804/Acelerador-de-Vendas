import React from 'react';
import { ArrowRight } from 'lucide-react';
import './LandingPage.css';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="login-page">
      {/* Header with Logo */}
      <header className="login-header">
        <div className="header-bar">
          <div className="header-container">
            <img 
              src="img/vendamais_logo.png" 
              alt="Venda Mais Logo" 
              className="header-logo"
            />
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <main className="login-main">
        <div className="login-content">
          <div className="login-text">
            <h1 className="login-title">
              <span className="login-title-accent">ACELERADOR DE</span>
              <span className="login-title-main">VENDAS</span>
            </h1>
            <p className="login-subtitle">
              Transforme estratégia em propostas.<br/>
              Execute. Pontue. Venda mais.
            </p>
            <button 
              onClick={onLoginClick}
              style={{
                backgroundColor: '#FF5E3A',
                color: 'white',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontFamily: 'var(--font-primary)',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: 'none',
                borderRadius: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(255, 94, 58, 0.3)'
              }}
            >
              Entrar
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          
          {/* Substituído o SVG pela sua Logo */}
          <div className="login-illustration">
            <img 
              src="img/img1_acelerador.png" 
              alt="Venda Mais Logo" 
              className="login-logo-img"
            />
          </div>
        </div>
      </main>

      {/* Wave Divider */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            fill="#FF5E3A" 
            fillOpacity="1" 
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>
    </div>
  );
};

export default LandingPage;