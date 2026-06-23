import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SESSION_CHECK_INTERVAL = 60 * 1000;
const ACTIVE_SESSION_WINDOW = 5 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000;
import dspaceService from '../services/dspaceService';
import axios from 'axios';

// Configure axios defaults
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;


const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const lastActivityRef = useRef(Date.now());
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasUser = Boolean(user);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Restore token to service first
            const storedToken = localStorage.getItem('dspaceAuthToken');
            if (storedToken) {
                dspaceService.authToken = storedToken;
            }

            // Always check status as cookies might exist even if local token doesn't
            const status = await dspaceService.checkAuthStatus();

            if (status.authenticated) {
                const eperson = status._embedded?.eperson;
                const userInfo = {
                    username: eperson?.name || eperson?.email || status.email || 'User',
                    email: eperson?.email || status.email,
                    authenticated: true,
                    id: eperson?.id || eperson?.uuid || status.id || status.uuid,
                    ...status
                };
                setUser(userInfo);
            } else {
                // Token might be expired
                localStorage.removeItem('dspaceAuthToken');
                localStorage.removeItem('dsAuthInfo');
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed", error);
            setUser(null);
            localStorage.removeItem('dspaceAuthToken');
            localStorage.removeItem('dsAuthInfo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };
        const activityEvents = [
            "click",
            "keydown",
            "mousemove",
            "scroll",
            "touchstart",
            "visibilitychange",
        ];

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, updateActivity, { passive: true });
        });

        return () => {
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, updateActivity);
            });
        };
    }, []);

    const clearAuthState = useCallback(() => {
        setUser(null);
        localStorage.removeItem('dspaceAuthToken');
        localStorage.removeItem('djangoToken');
        localStorage.removeItem('dsAuthInfo');
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const status = await dspaceService.refreshAuthentication();
            if (status.authenticated) {
                return true;
            }
        } catch (error) {
            console.error("Session refresh failed", error);
        }

        clearAuthState();
        return false;
    }, [clearAuthState]);

    useEffect(() => {
        if (!hasUser) return;

        const verifySession = async () => {
            if (dspaceService.isTokenExpired()) {
                clearAuthState();
                return;
            }

            const userIsActive =
                Date.now() - lastActivityRef.current <= ACTIVE_SESSION_WINDOW;
            if (userIsActive && dspaceService.isTokenExpired(REFRESH_BEFORE_EXPIRY)) {
                await refreshSession();
                return;
            }
        };

        verifySession();
        const heartbeatInterval = setInterval(
            verifySession,
            SESSION_CHECK_INTERVAL,
        );

        return () => clearInterval(heartbeatInterval);
    }, [hasUser, clearAuthState, refreshSession]);

    const login = async (email, password) => {
        try {
            // 1. Login to DSpace
            const result = await dspaceService.login(email, password);

            if (result.authenticated || result === true || dspaceService.isAuthenticated) {
                // Store the DSpace auth token
                if (dspaceService.authToken) {
                    localStorage.setItem('dspaceAuthToken', dspaceService.authToken);
                }

                // 2. ALSO Login to our Django Backend to get a local token for cataloging/uploading
                try {
                    const djangoResponse = await axios.post('/api/auth/login/', {
                        email: email,
                        password: password
                    });

                    if (djangoResponse.data && djangoResponse.data.token) {
                        localStorage.setItem('djangoToken', djangoResponse.data.token);
                    }
                } catch (djangoErr) {
                    console.warn("Django backend login failed, but DSpace succeeded:", djangoErr);
                    // We continue anyway as DSpace is the primary source
                }

                // Set user immediately after successful login
                const userInfo = {
                    username: email.split('@')[0] || 'User',
                    email: email,
                    authenticated: true,
                };
                setUser(userInfo);

                return { success: true };
            } else {
                throw new Error("Login failed");
            }
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    };

    const register = async (userData) => {
        console.warn("Registration not fully implemented for DSpace direct mode");
        return { success: false, message: "Use DSpace UI to register" };
    };

    const logout = async () => {
        try {
            await dspaceService.logout();
            localStorage.removeItem('dspaceAuthToken');
            localStorage.removeItem('djangoToken');
            localStorage.removeItem('dsAuthInfo');
            localStorage.removeItem('metadataEditorState');
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            localStorage.removeItem('dspaceAuthToken');
            localStorage.removeItem('djangoToken');
            localStorage.removeItem('dsAuthInfo');
            localStorage.removeItem('metadataEditorState');
            setUser(null);
        }
    };

    const value = {
        user,
        token: dspaceService.authToken || localStorage.getItem('dspaceAuthToken'),
        djangoToken: localStorage.getItem('djangoToken'),
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
