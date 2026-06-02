const DSPACE_API_URL = "/api/dspace";

const extractBearerToken = (token) => {
	if (!token) return null;
	return token.startsWith("Bearer ") ? token.slice("Bearer ".length) : token;
};

const readTokenExpiration = (token) => {
	const bearerToken = extractBearerToken(token);
	if (!bearerToken) return null;

	const [, payload] = bearerToken.split(".");
	if (!payload) return null;

	try {
		const normalizedPayload = payload
			.replace(/-/g, "+")
			.replace(/_/g, "/")
			.padEnd(Math.ceil(payload.length / 4) * 4, "=");
		const decodedPayload = atob(normalizedPayload);
		const data = JSON.parse(decodedPayload);
		return typeof data.exp === "number" ? data.exp * 1000 : null;
	} catch {
		return null;
	}
};

const getCookieExpiration = (value, days) => {
	if (typeof days === "number") {
		return new Date(Date.now() + days * 864e5);
	}

	const tokenExpiration = readTokenExpiration(value);
	if (tokenExpiration) {
		return new Date(tokenExpiration);
	}

	return new Date(Date.now() + 7 * 864e5);
};

// Cookie Helpers
export const setCookie = (name, value, days) => {
	const expires = getCookieExpiration(value, days).toUTCString();
	document.cookie = `${name}=${encodeURIComponent(
		value,
	)}; expires=${expires}; path=/; SameSite=Lax`;
};

export const getCookie = (name) => {
	const nameEQ = `${name}=`;
	const ca = document.cookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === " ") c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0)
			return decodeURIComponent(c.substring(nameEQ.length, c.length));
	}
	return null;
};

export const deleteCookie = (name) => {
	const hostname = window.location.hostname;
	const paths = ["/"];
	const domains = [hostname, `.${hostname}`, ""];

	for (const path of paths) {
		for (const domain of domains) {
			const domainPart = domain ? `; domain=${domain}` : "";
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domainPart};`;
		}
	}
};

class DSpaceService {
	constructor() {
		this.isAuthenticated = false;
		this.authToken = null;
		this.csrfToken = null;
	}

	async getCsrfToken() {
		try {
			const response = await fetch(`${DSPACE_API_URL}/security/csrf`, {
				method: "GET",
				credentials: "include",
				headers: { Accept: "application/json" },
			});

			if (response.status !== 200 && response.status !== 204) {
				return false;
			}

			const headerNames = [
				"DSPACE-XSRF-TOKEN",
				"XSRF-TOKEN",
				"X-XSRF-TOKEN",
				"dspace-xsrf-token",
				"xsrf-token",
				"x-xsrf-token",
			];

			for (const headerName of headerNames) {
				try {
					const token = response.headers.get(headerName);
					if (token) {
						this.csrfToken = token;
						return true;
					}
				} catch {}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));

			const token =
				getCookie("DSPACE-XSRF-COOKIE") ||
				getCookie("XSRF-TOKEN") ||
				getCookie("DSPACE-XSRF-TOKEN");
			if (token) {
				this.csrfToken = token;
				return true;
			}

			try {
				const body = await response.json();
				if (body.token || body.csrfToken || body.xsrfToken) {
					this.csrfToken = body.token || body.csrfToken || body.xsrfToken;
					return true;
				}
			} catch {}

			return false;
		} catch {
			return false;
		}
	}

	getCsrfHeaders(additionalHeaders = {}) {
		const headers = new Headers(additionalHeaders);
		if (this.csrfToken) {
			headers.set("X-XSRF-TOKEN", this.csrfToken);
			headers.set("DSPACE-XSRF-TOKEN", this.csrfToken);
			headers.set("X-CSRF-TOKEN", this.csrfToken);
			headers.set("X-CSRFToken", this.csrfToken);
		}

		const token = this.getStoredToken();
		if (token) {
			headers.set(
				"Authorization",
				token.startsWith("Bearer ") ? token : `Bearer ${token}`,
			);
		}

		return headers;
	}

	// Extract CSRF token from response headers
	updateCsrfTokenFromResponse(response) {
		const headerNames = [
			"DSPACE-XSRF-TOKEN",
			"XSRF-TOKEN",
			"X-XSRF-TOKEN",
			"X-CSRF-TOKEN",
			"X-CSRFToken",
			"X-CSRF-TOKEN",
			"dspace-xsrf-token",
			"xsrf-token",
			"x-xsrf-token",
		];

		for (const headerName of headerNames) {
			try {
				const token = response.headers.get(headerName);
				if (token) {
					this.csrfToken = token;
					break;
				}
			} catch {}
		}
	}

	// Ensure CSRF token is available before making requests
	async ensureCsrfToken() {
		// First check if we already have a token
		if (this.csrfToken) {
			return true;
		}

		// Check for token in cookies
		const token =
			getCookie("DSPACE-XSRF-COOKIE") ||
			getCookie("XSRF-TOKEN") ||
			getCookie("DSPACE-XSRF-TOKEN") ||
			getCookie("csrftoken");

		if (token) {
			this.csrfToken = token;
			return true;
		}

		// Fetch new token if none found
		return await this.getCsrfToken();
	}

	// Enhanced fetch wrapper that ensures CSRF token and updates it from responses
	async fetchWithCsrf(url, options = {}) {
		const requestOptions = { ...options };

		const makeRequest = async () => {
			const headers = this.getCsrfHeaders(requestOptions.headers || {});
			const enhancedOptions = {
				...requestOptions,
				headers,
				credentials: "include",
			};

			const response = await fetch(url, enhancedOptions);
			this.updateCsrfTokenFromResponse(response);
			return response;
		};

		// Ensure we have a CSRF token before making the request
		await this.ensureCsrfToken();

		let response = await makeRequest();

		if (response.status === 403) {
			const refreshed = await this.getCsrfToken();
			if (refreshed) {
				response = await makeRequest();
			}
		}

		return response;
	}

	updateAuthTokenFromResponse(response) {
		const authHeader =
			response.headers.get("Authorization") ||
			response.headers.get("authorization");
		if (authHeader) {
			this.authToken = authHeader;
			this.isAuthenticated = true;
		}

		return authHeader;
	}

	async login(username, password) {
		try {
			// Always fetch a fresh CSRF token for login
			await this.getCsrfToken();

			const formData = new URLSearchParams();
			formData.append("user", username);
			formData.append("password", password);

			const headers = this.getCsrfHeaders({
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			});

			let response = await fetch(`${DSPACE_API_URL}/authn/login`, {
				method: "POST",
				headers: headers,
				body: formData.toString(),
				credentials: "include",
			});

			// If we get 403, try one more time with a fresh token
			if (response.status === 403) {
				console.log("Login failed with 403, retrying with fresh CSRF token...");
				await this.getCsrfToken();
				const retryHeaders = this.getCsrfHeaders({
					"Content-Type": "application/x-www-form-urlencoded",
					Accept: "application/json",
				});

				response = await fetch(`${DSPACE_API_URL}/authn/login`, {
					method: "POST",
					headers: retryHeaders,
					body: formData.toString(),
					credentials: "include",
				});
			}

			this.updateCsrfTokenFromResponse(response);
			this.updateAuthTokenFromResponse(response);

			if (response.status === 200) {
				this.isAuthenticated = true;
				return await response.json().catch(() => ({ authenticated: true }));
			}

			if (response.status === 401) {
				throw new Error("Invalid email or password.");
			}

			throw new Error(`Login failed: ${response.status}`);
		} catch (error) {
			console.error("DSpace login error:", error);
			this.isAuthenticated = false;
			throw error;
		}
	}

	async checkAuthStatus() {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/authn/status`,
				{
					headers: { Accept: "application/json" },
				},
			);

			if (response.ok) {
				const data = await response.json();
				this.isAuthenticated = data.authenticated;
				return data;
			}
			return { authenticated: false };
		} catch {
			return { authenticated: false };
		}
	}

	async refreshAuthentication() {
		const currentToken = this.getStoredToken();
		if (!currentToken) {
			this.isAuthenticated = false;
			return { authenticated: false };
		}

		const response = await this.fetchWithCsrf(`${DSPACE_API_URL}/authn/login`, {
			method: "POST",
			headers: { Accept: "application/json" },
		});

		this.updateAuthTokenFromResponse(response);

		if (!response.ok || !this.authToken) {
			this.isAuthenticated = false;
			return { authenticated: false };
		}

		const status = await this.checkAuthStatus();
		return {
			...status,
			authenticated: status.authenticated !== false,
			refreshed: true,
		};
	}

	async getCollections() {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/core/collections`,
				{
					headers: { Accept: "application/json" },
				},
			);

			if (response.ok) {
				const data = await response.json();
				return data._embedded?.collections || [];
			}
			return [];
		} catch {
			return [];
		}
	}

	async getOwningCollection(url) {
		try {
			const response = await this.fetchWithCsrf(`${DSPACE_API_URL}${url}`, {
				headers: { Accept: "application/json" },
			});

			if (response.ok) {
				const data = await response.json();
				return data;
			}
			return [];
		} catch {
			return [];
		}
	}

	async getParentCommunity(url) {
		try {
			const response = await this.fetchWithCsrf(`${DSPACE_API_URL}${url}`, {
				headers: { Accept: "application/json" },
			});

			if (response.ok) {
				const data = await response.json();
				return data;
			}
			return [];
		} catch {
			return [];
		}
	}

	async getSubmitAuthorizedCollections(page = 0, size = 20) {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/core/collections/search/findSubmitAuthorized?page=${page}&size=${size}&query=&embed=parentCommunity`,
				{
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
				},
			);

			if (response.ok) {
				const data = await response.json();
				return {
					collections: data._embedded?.collections || [],
					page: data.page || {
						number: 0,
						size: size,
						totalPages: 1,
						totalElements: 0,
					},
				};
			}
			return {
				collections: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		} catch {
			return {
				collections: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		}
	}

	getStoredToken() {
		if (this.authToken) return this.authToken;

		try {
			const token = getCookie("dspaceAuthToken");
			if (token) return token;

			const m = document.cookie.match(/(?:^|;\s*)dsAuthInfo=([^;]+)/);
			if (m) {
				const decoded = decodeURIComponent(m[1]);
				if (decoded.startsWith("{")) {
					const obj = JSON.parse(decoded);
					if (obj?.accessToken) return obj.accessToken;
				}
				return decoded;
			}
		} catch {}
		return null;
	}

	getTokenExpiration() {
		return readTokenExpiration(this.getStoredToken());
	}

	isTokenExpired(bufferMs = 0) {
		const expiresAt = this.getTokenExpiration();
		return expiresAt ? Date.now() + bufferMs >= expiresAt : false;
	}

	buildMetadataListFromForm(metadata) {
		const out = [];
		const add = (key, raw) => {
			if (!raw) return;
			const vals = Array.isArray(raw) ? raw : [raw];
			for (const v of vals) {
				const value = String(v).trim();
				if (!value) continue;
				out.push({ key, value, language: null });
			}
		};
		const author = metadata.author || "";
		const dateIssued = metadata.dateIssued || metadata.publicationDate || "";

		add("dc.title", metadata.title);
		add("dc.contributor.author", author);
		add("dc.title.alternative", metadata.otherTitles);
		add("dc.subject", metadata.subjectKeywords);
		add("dc.description.abstract", metadata.abstract || metadata.description);
		add("dc.description.sponsorship", metadata.sponsors);
		add("dc.description", metadata.customField);
		add("dc.publisher", metadata.publisher);
		add("dc.identifier.citation", metadata.citation);
		add("dc.relation.ispartofseries", metadata.series);
		add("dc.identifier.other", metadata.reportNo);
		add("dc.date.issued", dateIssued);
		add("dc.language", metadata.language);
		add("dc.identifier.isbn", metadata.isbn);
		add("dc.identifier.issn", metadata.issn);
		add("dc.rights", metadata.rights);
		add("dc.identifier.uri", metadata.uri);
		add("dc.type", metadata.type);

		return out;
	}

	async createItem(collectionId, metadata) {
		const metadataList = this.buildMetadataListFromForm(metadata || {});
		if (!metadataList.length) {
			throw new Error("No metadata provided.");
		}

		const url1 = `${DSPACE_API_URL}/core/collections/${collectionId}/items`;
		const res1 = await this.fetchWithCsrf(url1, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ metadata: metadataList }),
		});

		if (res1.ok || res1.status === 201) {
			return await res1.json();
		}

		if (res1.status === 404 || res1.status === 405) {
			const url2 = `${DSPACE_API_URL}/core/items`;
			const res2 = await this.fetchWithCsrf(url2, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					metadata: metadataList,
					owningCollection: { uuid: collectionId },
				}),
			});

			if (res2.ok || res2.status === 201) {
				return await res2.json();
			}
		}

		throw new Error(`Failed to create item: ${res1.status}`);
	}

	async createWorkspaceItem(collectionId) {
		const response = await this.fetchWithCsrf(
			`${DSPACE_API_URL}/submission/workspaceitems?owningCollection=${collectionId}`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			},
		);

		if (response.ok || response.status === 201) {
			return await response.json();
		}
		throw new Error(`Workspace item creation failed: ${response.status}`);
	}

	async updateMetadata(
		workspaceItemId,
		metadataFields,
		sectionedMetadataFields = [],
	) {
		const metadataUpdates = [];

		for (const [field, raw] of Object.entries(metadataFields)) {
			if (!raw) continue;
			const vals = Array.isArray(raw) ? raw : [raw];
			const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

			if (cleaned.length > 0) {
				metadataUpdates.push({
					op: "add",
					path: `/sections/traditionalpageone/${field}`,
					value: cleaned.map((v) => ({ value: v })),
				});
			}
		}

		const mergedSectionedByField = {};
		for (const sectionedEntry of sectionedMetadataFields || []) {
			const section = sectionedEntry?.section;
			const field = sectionedEntry?.field;
			const rawValues = sectionedEntry?.values;
			if (!section || !field || !Array.isArray(rawValues)) continue;

			const cleaned = rawValues.map((v) => String(v).trim()).filter(Boolean);
			if (cleaned.length === 0) continue;

			if (!mergedSectionedByField[field]) {
				mergedSectionedByField[field] = {
					section,
					values: [],
				};
			}

			mergedSectionedByField[field].values.push(...cleaned);
		}

		for (const [field, entry] of Object.entries(mergedSectionedByField)) {
			metadataUpdates.push({
				op: "add",
				path: `/sections/${entry.section}/${field}`,
				value: entry.values.map((v) => ({ value: v })),
			});
		}
		if (metadataUpdates.length === 0) return true;

		try {
			const FIELD_SECTION_MAP = {
				"crvs.family.count": "traditionalpagetwo",
				"dc.description": "traditionalpagetwo",
				"crvs.vital.eventType": "vitalEventType",
				"crvs.birth.childName": "birth",
				"crvs.birth.gender": "birth",
				"crvs.birth.dateOfBirth": "birth",
				"crvs.birth.placeOfBirth": "birth",
				"crvs.birth.childCitizenship": "birth",
				"crvs.birth.motherName": "birth",
				"crvs.birth.motherCitizenship": "birth",
				"crvs.birth.fatherName": "birth",
				"crvs.birth.fatherCitizenship": "birth",
				"crvs.birth.registeredDate": "birth",
				"crvs.birth.certificateIssuedDate": "birth",
				"crvs.marriage.husbandName": "marriageAndDivorce",
				"crvs.marriage.wifeName": "marriageAndDivorce",
				"crvs.marriage.date": "marriageAndDivorce",
				"crvs.divorce.date": "marriageAndDivorce",
				"crvs.divorce.courtApprovalDate": "marriageAndDivorce",
				"crvs.divorce.courtCaseNumber": "marriageAndDivorce",
				"crvs.death.personName": "death",
				"crvs.death.gender": "death",
				"crvs.death.dateOfDeath": "death",
				"crvs.death.placeOfDeath": "death",
				"crvs.death.dateOfBirth": "death",
				"crvs.death.placeOfBirth": "death",
				"crvs.death.citizenship": "death",
				"crvs.death.motherName": "death",
				"crvs.death.fatherName": "death",
				"crvs.death.reason": "death",
				"crvs.death.certificateIssuedDate": "death",
			};

			const batch = metadataUpdates.map((p) => {
				if (!p.path.startsWith("/sections/traditionalpageone/")) {
					return p;
				}

				const fieldName = p.path.split("/").pop();
				let actualField = fieldName;
				if (actualField === "dc.language") actualField = "dc.language.iso";
				const section = FIELD_SECTION_MAP[actualField] || "traditionalpageone";
				return { ...p, path: `/sections/${section}/${actualField}` };
			});

			const res = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json-patch+json",
						Accept: "application/json",
					},
					body: JSON.stringify(batch),
				},
			).catch(() => {});
			console.log("🚀 ~ DSpaceService ~ updateMetadata ~ res:", res);

			return true;
		} catch {
			return true;
		}
	}

	async uploadFile(workspaceItemId, file) {
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("name", file.name);

			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "POST",
					headers: { Accept: "application/json" },
					body: formData,
				},
			);

			if (response.ok) {
				const data = await response.json();

				// In DSpace 9, the response is the WorkspaceItem.
				// The bitstream info is inside sections.upload.files
				const files = data.sections?.upload?.files;
				if (files && files.length > 0) {
					// The most recently uploaded file is usually the last one
					const latestFile = files[files.length - 1];
					return latestFile;
				}
				return data;
			} else {
				const errorText = await response.text().catch(() => "No error body");
				console.error(
					`Upload failed with status ${response.status}:`,
					errorText,
				);
			}
			return null;
		} catch {
			return false;
		}
	}

	async updateBitstreamMetadata(bitstreamUuid, metadata) {
		try {
			// Standard DSpace 7/8/9 BITSTREAM metadata update via PATCH
			const patch = [];
			if (metadata.documentType) {
				patch.push({
					op: "add",
					path: "/metadata/crvs.documentType",
					value: [
						{
							value: metadata.documentType,
							language: null,
							authority: null,
							confidence: -1,
						},
					],
				});
			}
			if (metadata.documentStatus) {
				patch.push({
					op: "add",
					path: "/metadata/crvs.document.status",
					value: [
						{
							value: metadata.documentStatus,
							language: null,
							authority: null,
							confidence: -1,
						},
					],
				});
			}

			if (patch.length === 0) return true;

			const url = `${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}`;

			const response = await this.fetchWithCsrf(url, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json-patch+json",
					Accept: "application/json",
				},
				body: JSON.stringify(patch),
			});

			if (!response.ok) {
				console.error(
					`Failed to update bitstream metadata: ${response.status}`,
				);
			}
			return response.ok;
		} catch (error) {
			console.error("Error updating bitstream metadata:", error);
			return false;
		}
	}

	async acceptWorkspaceLicense(workspaceItemId) {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json-patch+json",
						Accept: "application/json",
					},
					body: JSON.stringify([
						{ op: "replace", path: "/sections/license/granted", value: true },
					]),
				},
			);
			return response.ok;
		} catch {
			return false;
		}
	}

	async submitWorkspaceItem(workspaceItemId) {
		const id =
			typeof workspaceItemId === "object"
				? workspaceItemId.id || workspaceItemId.uuid
				: workspaceItemId;
		const workspaceUri = `${window.location.protocol}//${window.location.host}/server/api/submission/workspaceitems/${id}`;

		const response = await this.fetchWithCsrf(
			`${DSPACE_API_URL}/workflow/workflowitems`,
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "text/uri-list",
				},
				body: workspaceUri,
			},
		);

		if (response.ok || response.status === 201 || response.status === 202) {
			return await response.json().catch(() => ({ id: workspaceItemId }));
		}
		throw new Error(`Submission failed: ${response.status}`);
	}

	async searchItems(filters = {}, page = 0, size = 10) {
		try {
			const params = new URLSearchParams({
				page: String(page),
				size: String(size),
				dsoType: "item",
				embed: "bundles,owningCollection/parentCommunity",
			});
			const queryParts = [];

			Object.entries(filters).forEach(([key, filter]) => {
				if (filter?.value) {
					const value = String(filter.value).trim();
					const operator = filter.operator || "contains";

					if (!value) return;

					if (operator === "contains") {
						queryParts.push(`${key}:${value}*`);
						return;
					}

					if (operator === "notcontains") {
						queryParts.push(`-${key}:${value}*`);
						return;
					}

					params.append(`f.${key}`, `${value},${operator}`);
				}
			});

			if (queryParts.length > 0) {
				params.append("query", queryParts.join(" AND "));
			}

			const url = `${DSPACE_API_URL}/discover/search/objects?${params.toString().replace(/\*/g, "%2A")}`;
			const response = await this.fetchWithCsrf(url, {
				headers: { Accept: "application/json" },
			});

			if (response.ok) {
				const data = await response.json();
				return {
					objects: data?._embedded?.searchResult?._embedded?.objects || [],
					page: data?._embedded?.searchResult?.page || {
						number: 0,
						size: size,
						totalPages: 1,
						totalElements: 0,
					},
				};
			}
			return {
				objects: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		} catch {
			return {
				objects: [],
				page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
			};
		}
	}

	async getMySubmissions(userUuid) {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userUuid}`,
				{
					headers: { Accept: "application/json" },
				},
			);

			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}

	async getItem(itemId) {
		try {
			const response = await this.fetchWithCsrf(
				`${DSPACE_API_URL}/core/items/${itemId}`,
				{
					headers: { Accept: "application/json" },
				},
			);
			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}

	async logout() {
		try {
			await this.fetchWithCsrf(`${DSPACE_API_URL}/authn/logout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});
		} catch {
		} finally {
			this.isAuthenticated = false;
			this.authToken = null;
			this.csrfToken = null;
		}
	}

	async getBitstreams(bundleId) {
		try {
			const [primaryRes, bundledRes] = await Promise.all([
				this.fetchWithCsrf(
					`${DSPACE_API_URL}/core/bundles/${bundleId}/primaryBitstream`,
					{
						headers: { Accept: "application/json" },
					},
				),
				this.fetchWithCsrf(
					`${DSPACE_API_URL}/core/bundles/${bundleId}/bitstreams`,
					{
						headers: { Accept: "application/json" },
					},
				),
			]);

			const primaryBitstream =
				primaryRes.ok && primaryRes.status !== 204
					? await primaryRes.json()
					: null;
			const bundledBitstreams = bundledRes.ok ? await bundledRes.json() : null;
			return { primaryBitstream, bundledBitstreams };
		} catch {
			return null;
		}
	}

	async getBitstreamContent(bitstreamUuid) {
		const response = await this.fetchWithCsrf(
			`${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}/content`,
			{},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch bitstream content: ${response.status}`);
		}

		return await response.blob();
	}

	async fetchCollectionStats(page = 0, size = 20) {
		try {
			const url = new URL(
				`${window.location.origin}${DSPACE_API_URL}/statistics/collectionstats`,
			);
			url.searchParams.set("page", String(page));
			url.searchParams.set("size", String(size));

			const response = await this.fetchWithCsrf(url.toString(), {
				headers: { Accept: "application/json" },
			});
			if (response.ok) {
				const data = await response.json();
				return {
					collectionstatses: data._embedded?.collectionstatses || [],
					page: data.page || {
						number: 0,
						size,
						totalPages: 1,
						totalElements: 0,
					},
				};
			}
			throw new Error(`Failed to fetch collection stats: ${response.status}`);
		} catch (error) {
			console.warn("Failed to fetch collection stats:", error);
			return null;
		}
	}
}

export default new DSpaceService();
