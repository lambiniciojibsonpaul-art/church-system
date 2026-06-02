import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'

if (typeof window !== "undefined" && !window.__churchValidationMessagesAttached) {
  window.__churchValidationMessagesAttached = true;

  const setValidationMessage = (field) => {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
    field.setCustomValidity("");

    if (field.validity.valueMissing) {
      field.setCustomValidity("Please complete this required field before submitting.");
    } else if (field.validity.typeMismatch && field.type === "email") {
      field.setCustomValidity("Please enter a valid email address, for example name@example.com.");
    } else if (field.validity.tooShort) {
      field.setCustomValidity(`Please enter at least ${field.minLength} characters.`);
    } else if (field.validity.rangeUnderflow) {
      field.setCustomValidity("Amount cannot be negative. Please enter 0 or a higher amount.");
    }
  };

  document.addEventListener("invalid", (event) => {
    setValidationMessage(event.target);
    if (event.target instanceof HTMLElement) {
      window.setTimeout(() => {
        event.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, true);
  document.addEventListener("input", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      event.target.setCustomValidity("");
    }
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) {
      event.target.setCustomValidity("");
    }
  }, true);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
