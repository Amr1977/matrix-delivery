/**
 * Diagnostic Wrapper Component
 * Use this to wrap components and identify which one is causing the "Objects are not valid as a React child" error
 */

import React from 'react';

const DiagnosticWrapper = ({ name, children }) => {
  console.log(`[Diagnostic] Rendering: ${name}`);
  
  // Check if children is a valid React element
  if (children && typeof children === 'object' && !React.isValidElement(children)) {
    console.error(`[Diagnostic] ERROR in ${name}: children is an object but not a valid React element`, children);
    return <div style={{ color: 'red', padding: '20px' }}>
      Error in {name}: Invalid React child detected
    </div>;
  }
  
  return <>{children}</>;
};

export default DiagnosticWrapper;
