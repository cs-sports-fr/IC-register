import { createContext, useContext, useMemo, useState } from "react";
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

// eslint-disable-next-line react/prop-types
const AuthProvider = ({ children }) => {
    // State to hold the authentication token
    const [token, setToken_] = useState(localStorage.getItem("jwtToken"));
    const [username, setUsername] = useState(localStorage.getItem('username'))
    const [permission, setPermission] = useState(localStorage.getItem('permission'))
    const [id, setId] = useState(localStorage.getItem('id'))
    const [sportAdminId, setSportId] = useState(localStorage.getItem('sportId'))

    // Function to set the authentication token
    const setToken = (newToken) => {
        if (newToken === '') { // for logout
            return
        }
        setToken_(newToken);
        localStorage.setItem("jwtToken", newToken);

        // Extract username and permission from the token
        const decodedToken = jwtDecode(newToken);
        // console.log(decodedToken)
        const { username, permission, id, sport } = decodedToken;

        setUsername(username)
        setPermission(permission)
        setId(id)
        setSportId(sport)

        // Save username and permission in localstorage
        localStorage.setItem("username", username);
        localStorage.setItem("permission", permission);
        localStorage.setItem("id", id);
        localStorage.setItem("sportId", sport);
    };

    // Function to logout
    const logout = () => {
        setToken('');
        setUsername('');
        setPermission('');
        setId('');
        setSportId('');
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        localStorage.removeItem('permission');
        localStorage.removeItem('id');
        localStorage.removeItem('sportId');
    }


    // Memoized value of the authentication context
    const contextValue = useMemo(
        () => ({
            token,
            username,
            permission,
            id,
            sportAdminId,
            setToken,
            logout,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [token]
    );

    // Provide the authentication context to the children components
    return (
        <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext);
};

export default AuthProvider;