// src/api/axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000/api', // Cambia al dominio y puerto de tu backend
  withCredentials: true, // solo si manejas cookies/sesiones
});

export default instance;
