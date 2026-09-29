import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * Centralized Axios API client instance for OwnManage Frontend.
 * Attaches JWT Bearer token and active business header.
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || ''
    const isPublicAuth =
      url.includes('/auth/login') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/verify-otp') ||
      url.includes('/auth/activate')

    if (!isPublicAuth) {
      const token = localStorage.getItem('ownmanage_access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      const bizId = localStorage.getItem('ownmanage_selected_business_id')
      if (bizId) {
        config.headers['X-Business-ID'] = bizId
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('ownmanage_access_token')
      localStorage.removeItem('ownmanage_refresh_token')
      localStorage.removeItem('ownmanage_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
