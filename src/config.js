// API Configuration
const API_CONFIG = {
  // Development URL
  DEV_URL: 'http://localhost:3002/api',
  // Production URL
  PROD_URL: 'https://posapi.nileit.co.in/api'
};

// Use development URL if running locally, otherwise use production
export const API_BASE = import.meta.env.DEV ? API_CONFIG.DEV_URL : API_CONFIG.PROD_URL;