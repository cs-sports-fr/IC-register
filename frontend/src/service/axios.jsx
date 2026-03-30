import axios from "axios";


const ApiTossConnected = axios.create({
    baseURL: import.meta.env.VITE_API_TOSS_URL,
});

// Add an interceptor to attach the JWT token to each request
ApiTossConnected.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
},
    (error) => Promise.reject(error)
);

// Add a response interceptor for refreshing tokens
// ApiTossConnected.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//         const originalRequest = error.config;

//         // If the error status is 401 and there is no originalRequest._retry flag,
//         // it means the token has expired and we need to refresh it
//         if (error.response.status === 401 && !originalRequest._retry) {
//             originalRequest._retry = true;

//             try {
//                 const refreshToken = localStorage.getItem('refreshToken');
//                 const response = await axios.post('/api/refresh-token', { refreshToken });
//                 const { token } = response.data;

//                 localStorage.setItem('jwtToken', token);

//                 // Retry the original request with the new token
//                 originalRequest.headers.Authorization = `Bearer ${token}`;
//                 return axios(originalRequest);
//             } catch (error) {
//                 // Handle refresh token error or redirect to login
//             }
//         }

//         return Promise.reject(error);
//     }
// );

// Deconnexion si erreur 401 (token expiré)
ApiTossConnected.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response.status === 401) {
            localStorage.clear();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

const ApiTossNotConnected = axios.create({
    baseURL: import.meta.env.VITE_API_TOSS_URL,
});

export { ApiTossConnected, ApiTossNotConnected }