/**
 * SafeRender - Wrapper to catch and display rendering errors
 * Use this to wrap components that might be causing "Objects are not valid as a React child" errors
 */

import React from 'react';

const SafeRender = ({ component: Component, componentName, ...props }) => {
  try {
    // Check if Component is valid
    if (!Component) {
      console.error(`[SafeRender] Component "${componentName}" is undefined or null`);
      return <div style={{ color: 'red', padding: '20px' }}>
        Error: Component "{componentName}" not found
      </div>;
    }

    // Check if Component is a function or class
    if (typeof Component !== 'function') {
      console.error(`[SafeRender] Component "${componentName}" is not a function`, Component);
      return <div style={{ color: 'red', padding: '20px' }}>
        Error: "{componentName}" is not a valid React component
      </div>;
    }

    // Render the component
    const rendered = <Component {...props} />;
    
    // Validate the rendered output
    if (rendered && typeof rendered === 'object' && !React.isValidElement(rendered)) {
      console.error(`[SafeRender] Component "${componentName}" returned an invalid React element`, rendered);
      return <div style={{ color: 'red', padding: '20px' }}>
        Error: "{componentName}" returned an invalid React element
      </div>;
    }

    return rendered;
  } catch (error) {
    console.error(`[SafeRender] Error rendering "${componentName}":`, error);
    return <div style={{ color: 'red', padding: '20px', background: '#1a0000', border: '1px solid red' }}>
      <h3>Rendering Error in "{componentName}"</h3>
      <p>{error.message}</p>
      <pre style={{ fontSize: '12px', overflow: 'auto' }}>{error.stack}</pre>
    </div>;
  }
};

export default SafeRender;
