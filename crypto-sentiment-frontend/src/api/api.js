// src/api/api.js
import axios from 'axios'

// Reads VITE_API_BASE from the .env file, defaults to the FastAPI port (8000)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'
const api = axios.create({ baseURL: API_BASE, timeout: 15000 })

// Core functions used by Dashboard and other pages
export const getOverview = () => api.get('/sentiment/overview')
export const getRecent = (limit=30) => api.get(`/recent?limit=${limit}`)
export const getTrends = (coin='BTC', unit='day') => api.get(`/trends/${coin}?unit=${unit}`)

// Functions used by Twitter, Reddit, and News pages
export const getTwitter = (limit=25) => api.get(`/sentiment/twitter?limit=${limit}`)
export const getReddit = (limit=25) => api.get(`/sentiment/reddit?limit=${limit}`)
export const getNews = (limit=25) => api.get(`/sentiment/news?limit=${limit}`)

export default api