import { apiRequest } from './client';

export const getIssueTypesApi = () => apiRequest('/vendor/reports/issue-types');

export const submitReportApi = ({ issueType, description }) =>
  apiRequest('/vendor/reports', {
    method: 'POST',
    body: JSON.stringify({ issueType, description }),
  });

export const getMyReportsApi = () => apiRequest('/vendor/reports');