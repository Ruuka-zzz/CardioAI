import React from 'react';

// Reusable button component across the application
export default function Button({ children, onClick, type = 'button', variant = 'primary', style = {} }) {
  const baseStyle = {
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const variants = {
    primary: { backgroundColor: '#e63946', color: '#ffffff' },
    secondary: { backgroundColor: '#457b9d', color: '#ffffff' },
    outline: { backgroundColor: 'transparent', border: '1px solid #457b9d', color: '#457b9d' },
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      style={{ ...baseStyle, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}