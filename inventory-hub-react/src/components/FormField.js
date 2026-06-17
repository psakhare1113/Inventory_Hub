import React from 'react';
import ValidationMessage from './ValidationMessage';

const FormField = ({
  label,
  type = 'text',
  value,
  onChange,
  validation,
  placeholder,
  suggestions = [],
  onApplySuggestion,
  options = [],
  rows = 3,
  min,
  max,
  step,
  required = false
}) => {
  const hasError = validation && !validation.isValid;
  const hasSuccess = validation && validation.isValid && value;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
          />
        );
      
      default:
        return (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`form-input ${hasError ? 'error' : ''} ${hasSuccess ? 'success' : ''}`}
          />
        );
    }
  };

  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      
      <div className="input-container">
        {renderInput()}
        
        {hasSuccess && (
          <div className="input-icon success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          <div className="suggestions-header">Suggestions:</div>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => onApplySuggestion(suggestion)}
            >
              <span className="suggestion-text">{suggestion.text}</span>
              <span className="suggestion-reason">{suggestion.reason}</span>
            </div>
          ))}
        </div>
      )}

      <ValidationMessage validation={validation} />
    </div>
  );
};

export default FormField;