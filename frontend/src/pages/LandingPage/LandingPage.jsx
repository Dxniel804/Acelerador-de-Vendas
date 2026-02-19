import React from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './LandingPage.module.css';
import Button from '../../components/Button/Button';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className={styles.landingPage}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerContainer}>
            <img
              src="/img/vendamais_logo.png"
              alt="Venda Mais Logo"
              className={styles.headerLogo}
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.textContent}>
            <h1 className={styles.title}>
              <span className={styles.titleAccent}>ACELERADOR DE</span>
              <span className={styles.titleMain}>VENDAS</span>
            </h1>
            <p className={styles.subtitle}>
              Transforme estratégia em propostas.<br />
              Execute. Pontue. Venda mais.
            </p>
            <Button
              variant="primary"
              size="large"
              onClick={onLoginClick}
              className={styles.ctaButton}
            >
              Entrar
              <ArrowRight className={styles.arrowIcon} />
            </Button>
          </div>

          {/* Illustration */}
          <div className={styles.illustration}>
            <img
              src="/img/img1_acelerador.png"
              alt="Acelerador de Vendas"
              className={styles.illustrationImg}
            />
          </div>
        </div>
      </main>

      {/* Wave Divider */}
      <div className={styles.waveDivider}>
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="var(--primary-orange)"
            fillOpacity="1"
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,128C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      </div>
    </div>
  );
};

export default LandingPage;


