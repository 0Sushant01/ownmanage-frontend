import axios, { type AxiosInstance } from 'axios'

/**
 * Centralized Axios API client instance for OwnManage Frontend.
 * Base URL is dynamically read from Vite environment variables.
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor placeholder for future authentication token attachment
apiClient.interceptors.request.use(
  (config) => {
    // Auth token will be attached here in future authentication milestone
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor placeholder for future centralized error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient
