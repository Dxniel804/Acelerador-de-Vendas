import React from 'react';
import styles from './Label.module.css';

const Label = ({ 
  children, 
  htmlFor, 
  required = false, 
  className = '',
  ...props 
}) => {
  const labelClasses = [
    styles.label,
    className
  ].filter(Boolean).join(' ');

  return (
    <label htmlFor={htmlFor} className={labelClasses} {...props}>
      {children}
      {required && <span className={styles.required}>*</span>}
    </label>
  );
};

export default Label;


