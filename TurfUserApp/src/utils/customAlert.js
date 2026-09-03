import { Alert } from 'react-native';

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
    nativeAlert(title, message, buttons, options);
  }
};

const nativeAlert = Alert.alert;

export const initCustomAlert = () => {
  Alert.alert = (title, message, buttons, options) => {
    showCustomAlert(title, message, buttons, options);
  };
};
