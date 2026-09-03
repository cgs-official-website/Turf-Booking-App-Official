import { Alert } from 'react-native';

// Global event listener registry for custom alert modal
let alertListener = null;

export const registerAlertListener = (listener) => {
  alertListener = listener;
  return () => {
    alertListener = null;
  };
};

export const showCustomAlert = (title, message, buttons = [], options = {}) => {
  if (alertListener) {
    alertListener({
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
      options,
    });
  } else {
    // Fallback to native alert if modal is not yet mounted
    nativeAlert(title, message, buttons, options);
  }
};

// Keep reference to original native alert
const nativeAlert = Alert.alert;

// Patch Alert.alert globally
export const initCustomAlert = () => {
  Alert.alert = (title, message, buttons, options) => {
    showCustomAlert(title, message, buttons, options);
  };
};
