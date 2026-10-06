import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuraContainer = ({ score, children }) => {
  const isHighLoad = score > 70;

  return (
    <motion.div
      layout
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        padding: '24px',
        borderRadius: '16px',
        background: isHighLoad ? '#121212' : '#f4f6f8',
        color: isHighLoad ? '#ffffff' : '#1a1a1a',
        maxWidth: isHighLoad ? '800px' : '1200px',
        margin: '0 auto',
        boxShadow: isHighLoad 
          ? '0 10px 30px rgba(0,0,0,0.5)' 
          : '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isHighLoad ? 'high-load-ui' : 'normal-load-ui'}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default AuraContainer;