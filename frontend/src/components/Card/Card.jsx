import React from 'react';
import styles from './Card.module.css';

const Card = ({ 
  children, 
  variant = 'default', 
  padding = 'medium', 
  shadow = 'md',
  className = '',
  ...props 
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    styles[`shadow-${shadow}`],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;
