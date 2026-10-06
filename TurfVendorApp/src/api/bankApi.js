import { apiRequest } from './client';

export const bankApi = {
  getBankDetails: async () => {
    const data = await apiRequest('/vendor/bank-details');
    return data;
  },
  updateBankDetails: async (bankData) => {
    const data = await apiRequest('/vendor/bank-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bankData),
    });
    return data;
  },
};

export default bankApi;
