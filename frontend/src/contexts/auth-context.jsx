import axios from "axios";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import dspaceService, {
	deleteCookie,
	getCookie,
	setCookie,
} from "../services/dspaceService";

// Configure axios defaults
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";
axios.defaults.withCredentials = true;

const AuthContext = createContext();
const SESSION_CHECK_INTERVAL = 60 * 1000;
const ACTIVE_SESSION_WINDOW = 5 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000;

const defaultAuthContext = {
	user: null,
	token: null,
	djangoToken: null,
	login: async () => {
		throw new Error("AuthProvider is not mounted.");
	},
	logout: async () => { },
	loading: true,
};

const getMetadataValue = (metadata, field) => {
	const values = metadata?.[field];
	return Array.isArray(values) ? values[0]?.value : null;
};

const buildUserInfo = (status, fallback = {}) => {
	const eperson = status?._embedded?.eperson || status?.eperson || {};
	const firstName =
		eperson.firstName ||
		getMetadataValue(eperson.metadata, "eperson.firstname");
	const lastName =
		eperson.lastName || getMetadataValue(eperson.metadata, "eperson.lastname");
	const fullName =
		eperson.name ||
		[firstName, lastName].filter(Boolean).join(" ").trim() ||
		fallback.name ||
		fallback.username ||
		eperson.email ||
		status?.email ||
		fallback.email ||
		"User";
	const email = eperson.email || status?.email || fallback.email || "";

	return {
		...fallback,
		...status,
		...eperson,
		id: eperson.id || eperson.uuid || status?.id || status?.uuid || fallback.id,
		uuid: eperson.uuid || status?.uuid || fallback.uuid,
		name: fullName,
		username: fullName,
		email,
		authenticated: true,
	};
};

const isSameUser = (current, next) => {
	if (!current || !next) return current === next;

	return (
		current.authenticated === next.authenticated &&
		current.id === next.id &&
		current.uuid === next.uuid &&
		current.name === next.name &&
		current.username === next.username &&
		current.email === next.email
	);
};

export { AuthContext };

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		return defaultAuthContext;
	}
	return context;
};

export const AuthProvider = ({ children }) => {
	const lastActivityRef = useRef(Date.now());
	const currentUserRef = useRef(null);
	const [user, setUser] = useState(() => {
		try {
			const savedUser = getCookie("dspaceUser");
			return savedUser ? JSON.parse(savedUser) : null;
		} catch {
			return null;
		}
	});
	const [loading, setLoading] = useState(!user);
	const hasUser = Boolean(user);

	useEffect(() => {
		currentUserRef.current = user;
	}, [user]);

	const deleteAuthCookies = useCallback(() => {
		[
			"DSPACE-XSRF-COOKIE",
			"DSPACE-XSRF-TOKEN",
			"csrftoken",
			"sessionid",
			"dsAuthInfo",
			"dspaceAuthToken",
			"djangoToken",
			"dspaceUser",
		].forEach(deleteCookie);
	}, []);

	const clearAuthState = useCallback(() => {
		dspaceService.isAuthenticated = false;
		dspaceService.authToken = null;
		deleteAuthCookies();
		setUser(null);
	}, [deleteAuthCookies]);

	const saveAuthenticatedUser = useCallback((status, fallback = {}) => {
		if (dspaceService.authToken) {
			setCookie("dspaceAuthToken", dspaceService.authToken);
		}

		const userInfo = buildUserInfo(status, fallback);
		setUser((currentUser) =>
			isSameUser(currentUser, userInfo) ? currentUser : userInfo,
		);
		setCookie("dspaceUser", JSON.stringify(userInfo));
		return userInfo;
	}, []);

	const checkAuth = useCallback(async () => {
		try {
			const storedToken = getCookie("dspaceAuthToken");
			if (storedToken) {
				// Also update service state
				dspaceService.authToken = storedToken;
				dspaceService.isAuthenticated = true;

				const status = await dspaceService.checkAuthStatus();
				if (status.authenticated) {
					saveAuthenticatedUser(status, currentUserRef.current || {});
				} else {
					clearAuthState();
				}
			} else {
				clearAuthState();
			}
		} catch (error) {
			console.error("Auth check failed", error);
			clearAuthState();
		} finally {
			setLoading(false);
		}
	}, [clearAuthState, saveAuthenticatedUser]);

	const refreshSession = useCallback(async () => {
		try {
			const status = await dspaceService.refreshAuthentication();
			if (status.authenticated) {
				saveAuthenticatedUser(status, currentUserRef.current || {});
				return true;
			}
		} catch (error) {
			console.error("Session refresh failed", error);
		}

		clearAuthState();
		return false;
	}, [clearAuthState, saveAuthenticatedUser]);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

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

	// Refresh while the user is active. If the JWT expires anyway, clear local
	// auth state so protected screens are closed immediately.
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

			await checkAuth();
		};

		verifySession();
		const heartbeatInterval = setInterval(
			verifySession,
			SESSION_CHECK_INTERVAL,
		);

		return () => clearInterval(heartbeatInterval);
	}, [checkAuth, clearAuthState, hasUser, refreshSession]);

	const login = async (email, password) => {
		try {
			// 1. Login to DSpace
			const result = await dspaceService.login(email, password);

			if (
				result.authenticated ||
				result === true ||
				dspaceService.isAuthenticated
			) {
				// Store the DSpace auth token in cookie
				if (dspaceService.authToken) {
					setCookie("dspaceAuthToken", dspaceService.authToken);
				}

				// 2. ALSO Login to our Django Backend to get a local token for cataloging/uploading
				try {
					const djangoResponse = await axios.post("/api/auth/login/", {
						email: email,
						password: password,
					});

					if (djangoResponse.data?.token) {
						setCookie("djangoToken", djangoResponse.data.token);
					}
				} catch (djangoErr) {
					console.warn(
						"Django backend login failed, but DSpace succeeded:",
						djangoErr,
					);
					// We continue anyway as DSpace is the primary source
				}

				const fallbackUser = {
					email: email,
					username: email.split("@")[0] || "User",
					authenticated: true,
				};
				const status = await dspaceService.checkAuthStatus();
				saveAuthenticatedUser(
					status.authenticated ? status : result,
					fallbackUser,
				);

				return { success: true };
			} else {
				throw new Error("Login failed");
			}
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	};

	const logout = async () => {
		try {
			await dspaceService.logout();
			clearAuthState();
		} catch (error) {
			console.error("Logout error:", error);
			clearAuthState();
		}
	};

	const value = {
		user,
		token: dspaceService.authToken || getCookie("dspaceAuthToken"),
		djangoToken: getCookie("djangoToken"),
		login,
		logout,
		loading,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
