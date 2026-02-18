import React from 'react';
import styles from './Input.module.css';

const Input = ({ 
  label, 
  error, 
  helperText, 
  required = false, 
  className = '',
  ...props 
}) => {
  const inputClasses = [
    styles.input,
    error && styles.error,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && <span className={styles.errorText}>{error}</span>}
      {helperText && !error && (
        <span className={styles.helperText}>{helperText}</span>
      )}
    </div>
  );
};

export default Input;
