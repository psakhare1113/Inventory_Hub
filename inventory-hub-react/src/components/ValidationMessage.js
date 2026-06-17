import React from 'react';

const ValidationMessage = ({ validation }) => {
  if (!validation) return null;

  const { isValid, errors } = validation;

  if (isValid) {
    return null; // No message for valid fields
  }

  if (errors && errors.length > 0) {
    return (
      <div className="validation-messages">
        {errors.map((error, index) => (
          <div key={index} className="validation-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{error}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default ValidationMessage;