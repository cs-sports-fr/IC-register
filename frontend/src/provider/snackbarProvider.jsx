import { createContext, useContext, useState, useCallback } from 'react';
import { Alert, Snackbar } from '@mui/material';

const SnackbarContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbar() {
    return useContext(SnackbarContext);
}

// eslint-disable-next-line react/prop-types
export const SnackbarProvider = ({ children }) => {
    const [snackbar, setSnackbar] = useState({ open: false, message: '', duration: 6000, severity: 'success' });

    const showSnackbar = useCallback((message, duration = 6000, severity) => {
        setSnackbar({ open: true, message, duration, severity });
    }, []);

    const hideSnackbar = useCallback(() => {
        setSnackbar({ ...snackbar, open: false });
    }, [snackbar]);

    return (
        <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
            {children}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={snackbar.duration}
                onClose={hideSnackbar}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={hideSnackbar}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};
