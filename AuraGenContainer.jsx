import React from 'react';

export default function AuraContainer({ score, children }) {
  const isHighLoad = score >= 80;
  
  return (
    <div style={{
      border: `2px solid ${isHighLoad ? '#ff4d4d' : '#4CAF50'}`,
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      backgroundColor: isHighLoad ? '#fff5f5' : '#f9fff9'
    }}>
      {children}
    </div>
  );
}