import React, { useState } from 'react';
import styles from './Tabs.module.css';

const Tabs = ({ children, defaultValue, className = '', onValueChange }) => {
  const [activeTab, setActiveTab] = useState(defaultValue || '');

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <div className={`${styles.tabs} ${className}`}>
      {React.Children.map(children, child => {
        if (child.type.name === 'TabsList') {
          return React.cloneElement(child, { activeTab, setActiveTab: handleTabChange });
        }
        if (child.type.name === 'TabsContent') {
          return React.cloneElement(child, { activeTab });
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ children, activeTab, setActiveTab, className = '' }) => {
  return (
    <div className={`${styles.tabsList} ${className}`}>
      {React.Children.map(children, child => {
        if (child.type.name === 'TabsTrigger') {
          return React.cloneElement(child, { 
            isActive: activeTab === child.props.value,
            onClick: () => setActiveTab(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
};

const TabsTrigger = ({ children, value, isActive, onClick, className = '' }) => {
  return (
    <button
      className={`${styles.tabsTrigger} ${isActive ? styles.active : ''} ${className}`}
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ children, value, activeTab, className = '' }) => {
  if (activeTab !== value) return null;
  
  return (
    <div className={`${styles.tabsContent} ${className}`} role="tabpanel">
      {children}
    </div>
  );
};

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export default Tabs;


