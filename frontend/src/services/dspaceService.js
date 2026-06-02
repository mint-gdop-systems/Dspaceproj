// Use proxy to avoid CORS issues - proxy forwards /api/dspace to http://localhost:8080/server/api
const DSPACE_API_URL = "/api/dspace";

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
                } catch (e) { }
            }

            await new Promise((resolve) => setTimeout(resolve, 200));

            const cookies = document.cookie.split(";");
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split("=");
                if (
                    name === "DSPACE-XSRF-COOKIE" ||
                    name === "XSRF-TOKEN" ||
                    name === "DSPACE-XSRF-TOKEN"
                ) {
                    this.csrfToken = decodeURIComponent(value);
                    return true;
                }
            }

            try {
                const body = await response.json();
                if (body.token || body.csrfToken || body.xsrfToken) {
                    this.csrfToken = body.token || body.csrfToken || body.xsrfToken;
                    return true;
                }
            } catch (e) { }

            return false;
        } catch (error) {
            return false;
        }
    }

    getCsrfHeaders(additionalHeaders = {}) {
        const headers = { ...additionalHeaders };
        if (this.csrfToken) {
            headers["X-XSRF-TOKEN"] = this.csrfToken;
            headers["DSPACE-XSRF-TOKEN"] = this.csrfToken;
        }
        return headers;
    }

    async login(username, password) {
        try {
            if (!(await this.getCsrfToken())) {
                throw new Error("Failed to get CSRF token.");
            }

            const formData = new URLSearchParams();
            formData.append("user", username);
            formData.append("password", password);

            const headers = this.getCsrfHeaders({
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            });

            const response = await fetch(`${DSPACE_API_URL}/authn/login`, {
                method: "POST",
                headers: headers,
                body: formData.toString(),
                credentials: "include",
            });

            const newToken =
                response.headers.get("DSPACE-XSRF-TOKEN") ||
                response.headers.get("XSRF-TOKEN") ||
                response.headers.get("X-XSRF-TOKEN");
            if (newToken) {
                this.csrfToken = newToken;
            }

            const authHeader =
                response.headers.get("Authorization") ||
                response.headers.get("authorization");
            if (authHeader) {
                this.authToken = authHeader;
            }

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
            // Ensure we have a CSRF token even on first load
            if (!this.csrfToken) {
                await this.getCsrfToken();
            }

            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(`${DSPACE_API_URL}/authn/status`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                this.isAuthenticated = data.authenticated;
                return data;
            }
            return { authenticated: false };
        } catch (error) {
            return { authenticated: false };
        }
    }

    async getCollections() {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            
            const response = await fetch(`${DSPACE_API_URL}/core/collections`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                return data._embedded?.collections || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    getStoredToken() {
        if (this.authToken) return this.authToken;
        try {
            const raw = localStorage.getItem("dspaceAuthToken");
            if (raw) return raw;
        } catch (e) { }
        try {
            const raw = localStorage.getItem("dsAuthInfo");
            if (raw) {
                const obj = JSON.parse(raw);
                if (obj && obj.accessToken) return obj.accessToken;
            }
        } catch (e) { }
        try {
            const m = document.cookie.match(/(?:^|;\s*)dsAuthInfo=([^;]+)/);
            if (m) {
                const decoded = decodeURIComponent(m[1]);
                const obj = JSON.parse(decoded);
                if (obj && obj.accessToken) return obj.accessToken;
            }
        } catch (e) { }
        return null;
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
        add("legal.case.fileNumber", metadata.fileNumber);
        add("legal.case.type", metadata.caseType);
        add("legal.case.plaintiff", metadata.plaintiff);
        add("legal.case.defendant", metadata.defendant);
        add("legal.case.representative", metadata.caseRepresentative);
        add("legal.date.registration", metadata.registrationDate);
        // add("legal.case.level", metadata.caseLevel);
        add("legal.case.status", metadata.caseStatus);
        // add("legal.judge.primary", metadata.primaryJudge);
        // add("legal.judge.number", metadata.judgeNumber);
        add("legal.location", metadata.location);
        add("legal.bench.session", metadata.benchSession);
        add("legal.case.format", metadata.recordFormat);
        add("dc.description", metadata.description);
        add("legal.physical.shelfNumber", metadata.shelfNumber);
        add("legal.physical.rowNumber", metadata.rowNumber);
        add("legal.physical.colNumber", metadata.colNumber);
        add("legal.physical.rfid", metadata.rfid);

        return out;
    }

    async createItem(collectionId, metadata) {
        const headers = this.getCsrfHeaders({
            Accept: "application/json",
            "Content-Type": "application/json",
        });

        const token = this.getStoredToken();
        if (token) {
            headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
        }

        const metadataList = this.buildMetadataListFromForm(metadata || {});
        if (!metadataList.length) {
            throw new Error("No metadata provided.");
        }

        const url1 = `${DSPACE_API_URL}/core/collections/${collectionId}/items`;
        const res1 = await fetch(url1, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ metadata: metadataList }),
        });

        if (res1.ok || res1.status === 201) {
            return await res1.json();
        }

        if (res1.status === 404 || res1.status === 405) {
            const url2 = `${DSPACE_API_URL}/core/items`;
            const res2 = await fetch(url2, {
                method: "POST",
                headers,
                credentials: "include",
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
        try {
            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "application/json",
            });

            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems?owningCollection=${collectionId}`,
                {
                    method: "POST",
                    headers: headers,
                    credentials: "include",
                }
            );

            if (response.ok || response.status === 201) {
                return await response.json();
            }
            throw new Error(`Workspace item creation failed: ${response.status}`);
        } catch (error) {


            throw error;
        }
    }

    async updateMetadata(workspaceItemId, metadata) {
        try {
            const token = this.getStoredToken();
            const baseHeaders = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                baseHeaders["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const metadataUpdates = [];
            const dcFields = {
                "legal.case.fileNumber": metadata.fileNumber,
                "legal.case.type": metadata.caseType,
                "legal.case.plaintiff": metadata.plaintiff,
                "legal.case.defendant": metadata.defendant,
                "legal.case.representative": metadata.caseRepresentative,
                "legal.date.registration": metadata.registrationDate,
                
                // "legal.case.level": metadata.caseLevel,
                "legal.case.status": metadata.caseStatus,
                // "legal.judge.primary": metadata.primaryJudge,
                // "legal.judge.number": metadata.judgeNumber,
                "legal.location": metadata.location,
                "legal.bench.session": metadata.benchSession,
                "legal.case.format": metadata.recordFormat,
                "dc.description": metadata.description,

                "legal.physical.shelfNumber": metadata.shelfNumber,
                "legal.physical.rowNumber": metadata.rowNumber,
                "legal.physical.colNumber": metadata.colNumber,
                "legal.physical.rfid": metadata.rfid,
            };

            for (const [field, raw] of Object.entries(dcFields)) {
                if (!raw) continue;
                const vals = Array.isArray(raw) ? raw : [raw];
                const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

                if (cleaned.length > 0) {
                    // We'll map to the correct section in the batch step
                    metadataUpdates.push({
                        op: "replace",
                        path: field,
                        value: cleaned.map(v => ({ value: v }))
                    });
                }
            }

            if (metadataUpdates.length === 0) return true;

            const FIELD_SECTION_MAP = {
                "legal.case.fileNumber": "traditionalpageone",
                "legal.case.type": "traditionalpageone",
                "legal.case.plaintiff": "traditionalpageone",
                "legal.case.defendant": "traditionalpageone",
                "legal.case.representative": "traditionalpageone",
                "legal.date.registration": "traditionalpageone",

                // "legal.case.level": "traditionalpagetwo",
                "legal.case.status": "traditionalpagetwo",
                // "legal.judge.primary": "traditionalpagetwo",
                // "legal.judge.number": "traditionalpagetwo",
                "legal.location": "traditionalpagetwo",
                "legal.bench.session": "traditionalpagetwo",
                "legal.case.format": "traditionalpagetwo",
                "dc.description": "traditionalpagetwo",

                "legal.physical.shelfNumber": "physicalLocationForm",
                "legal.physical.rowNumber": "physicalLocationForm",
                "legal.physical.colNumber": "physicalLocationForm",
                "legal.physical.rfid": "physicalLocationForm",
            };

            const fieldExists = (sections, section, field) =>
                !!sections?.[section]?.fields?.[field];


            // DSpace 9 Debug Strategy: Send fields one by one to find the culprit
            console.log("DSpace 9: Starting step-by-step metadata update to find the failing field...");

            const results = [];
            for (const update of metadataUpdates) {
                const field = update.path;
                const section = FIELD_SECTION_MAP[field] || "traditionalpageone";

                // DSpace 7/8/9 value format: [{ value: "...", language: "..." }]
                // We default to the form's language if available
                const patchOp = {
                    op: "add",
                    path: `/sections/${section}/${field}`,
                    value: update.value.map(v => ({
                        value: v.value,
                        language: null,
                        authority: null,
                        confidence: -1
                    }))

                };

                try {
                    const response = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                        method: "PATCH",
                        headers: baseHeaders,
                        credentials: "include",
                        body: JSON.stringify([patchOp]),
                    });

                    if (!response.ok) {
                        let errorMsg = `Field ${field} failed (${response.status})`;
                        try {
                            const errorObj = await response.json();
                            if (errorObj.message) {
                                errorMsg += `: ${errorObj.message}`;
                            }
                        } catch (e) { }
                        console.error(`- Error patching ${field}:`, errorMsg);
                        results.push({ field, success: false, error: errorMsg });
                    } else {
                        console.log(`- Successfully patched ${field}`);
                        results.push({ field, success: true });
                    }
                } catch (e) {
                    console.error(`- Critical error on ${field}:`, e.message);
                    results.push({ field, success: false, error: e.message });
                }
            }

            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                const failureDetails = failures.map(f => `${f.field}: ${f.error}`).join("\n");
                throw new Error(`Metadata update partially failed:\n${failureDetails}`);
            }

            return true;
        } catch (error) {
            console.error("DSpace updateMetadata error:", error);
            throw error;
        }
    }

    async uploadFile(workspaceItemId, file) {
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", file.name);

            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: headers,
                    body: formData,
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log("DSpace 9 Upload Response (WorkspaceItem):", data);

                // In DSpace 9, the response is the WorkspaceItem. 
                // The bitstream info is inside sections.upload.files
                const files = data.sections?.upload?.files;
                if (files && files.length > 0) {
                    // The most recently uploaded file is usually the last one
                    const latestFile = files[files.length - 1];
                    console.log("Extracted Bitstream UUID:", latestFile.uuid);
                    return latestFile;
                }
                return data;
            } else {
                const errorText = await response.text().catch(() => "No error body");
                console.error(`Upload failed with status ${response.status}:`, errorText);
            }
            return null;
        } catch (error) {
            console.error("Critical error in uploadFile:", error);
            return null;
        }
    }

    async updateBitstreamMetadata(bitstreamUuid, metadata) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const patch = [];
            
            if (metadata.title) {
                patch.push({ op: "add", path: "/metadata/dc.title", value: [{ value: metadata.title, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.section) {
                patch.push({ op: "add", path: "/metadata/legal.document.section", value: [{ value: metadata.section, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.type) {
                patch.push({ op: "add", path: "/metadata/legal.document.type", value: [{ value: metadata.type, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.exhibitCode) {
                patch.push({ op: "add", path: "/metadata/legal.document.exhibitCode", value: [{ value: metadata.exhibitCode, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.status) {
                patch.push({ op: "add", path: "/metadata/legal.document.status", value: [{ value: metadata.status, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.description) {
                patch.push({ op: "add", path: "/metadata/dc.description", value: [{ value: metadata.description, language: null, authority: null, confidence: -1 }] });
            }

            if (patch.length === 0) return true;

            const url = `${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}`;
            console.log(`DSpace 9: Patching bitstream metadata at ${url}`);

            const response = await fetch(url, {
                method: "PATCH",
                credentials: "include",
                headers: headers,
                body: JSON.stringify(patch),
            });

            if (!response.ok) {
                console.error(`Failed to update bitstream metadata: ${response.status}`);
            }
            return response.ok;
        } catch (error) {
            console.error("Error updating bitstream metadata:", error);
            return false;
        }
    }


    async submitWorkspaceItem(workspaceItemId) {
        try {
            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "text/uri-list",
            });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const id = typeof workspaceItemId === 'object' ? (workspaceItemId.id || workspaceItemId.uuid) : workspaceItemId;
            const workspaceUri = `${window.location.protocol}//${window.location.host}/server/api/submission/workspaceitems/${id}`;

            const response = await fetch(`${DSPACE_API_URL}/workflow/workflowitems`, {
                method: "POST",
                credentials: "include",
                headers: headers,
                body: workspaceUri,
            });

            if (response.ok || response.status === 201 || response.status === 202) {
                return await response.json().catch(() => ({ id: workspaceItemId }));
            }
            throw new Error(`Submission failed: ${response.status}`);
        } catch (error) {
            throw error;
        }
    }

    async searchItems(query, limit = 100) {
        try {
            // Add embed=owningCollection to get collection details in one request
            const params = new URLSearchParams({
                query: query || "*",
                page: "0",
                size: String(limit),
                embed: "owningCollection"
            });
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const response = await fetch(`${DSPACE_API_URL}/discover/search/objects?${params}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                return data._embedded?.searchResult?._embedded?.objects || [];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async getItem(itemId) {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const response = await fetch(`${DSPACE_API_URL}/core/items/${itemId}`, {
                credentials: "include",
                headers: headers,
            });
            return response.ok ? await response.json() : null;
        } catch (error) {
            return null;
        }
    }

    async logout() {
        try {
            const headers = this.getCsrfHeaders({ "Content-Type": "application/x-www-form-urlencoded" });
            await fetch(`${DSPACE_API_URL}/authn/logout`, { method: "POST", credentials: "include", headers: headers });
        } catch (error) {
        } finally {
            this.isAuthenticated = false;
            this.authToken = null;
            this.csrfToken = null;
        }
    }

    async fetchCollectionStats(page = 0, size = 20) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const url = `${DSPACE_API_URL}/statistics/collectionstats?page=${page}&size=${size}`;
            const response = await fetch(url, {
                credentials: "include",
                headers: headers,
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

    async getMySubmissions(userUuid) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userUuid}`,
                {
                    credentials: "include",
                    headers: headers,
                }
            );

            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error("Error in getMySubmissions:", error);
            return null;
        }
    }

    async getSubmitAuthorizedCollections(page = 0, size = 20) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "application/json",
            });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/core/collections/search/findSubmitAuthorized?page=${page}&size=${size}&query=&embed=parentCommunity`,
                {
                    credentials: "include",
                    headers: headers,
                }
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
        } catch (error) {
            console.error("Error in getSubmitAuthorizedCollections:", error);
            return {
                collections: [],
                page: { number: 0, size: size, totalPages: 0, totalElements: 0 },
            };
        }
    }

    async getOwningCollection(url) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(`${DSPACE_API_URL}${url}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Error in getOwningCollection:", error);
            return null;
        }
    }

    async getParentCommunity(url) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(`${DSPACE_API_URL}${url}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Error in getParentCommunity:", error);
            return null;
        }
    }

    async getRelatedCirculationEvents(caseFileUuid) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await fetch(
                `${DSPACE_API_URL}/core/items/${caseFileUuid}/relationships`,
                {
                    credentials: "include",
                    headers: headers,
                }
            );

            if (!response.ok) {
                console.error(`Failed to fetch relationships: ${response.status}`);
                return [];
            }

            const data = await response.json();
            const relationships = data._embedded?.relationships || [];
            
            const events = [];
            for (const rel of relationships) {
                const rightItemHref = rel._links?.rightItem?.href;
                if (rightItemHref) {
                    const pathIndex = rightItemHref.indexOf("/api/core/items/");
                    if (pathIndex === -1) continue;
                    const relativePath = rightItemHref.substring(pathIndex);
                    
                    const itemResponse = await fetch(`${DSPACE_API_URL}${relativePath}`, {
                        credentials: "include",
                        headers: headers,
                    });
                    
                    if (itemResponse.ok) {
                        const itemData = await itemResponse.json();
                        const metadata = itemData.metadata || {};
                        const getVal = (key) => metadata[key]?.[0]?.value || "";
                        
                        events.push({
                            id: itemData.uuid || itemData.id,
                            title: getVal("dc.title") || itemData.name,
                            eventDate: getVal("legal.event.date") || "—",
                            status: getVal("legal.event.status") || "—",
                            handover: getVal("legal.event.handover") || "—",
                            receiver: getVal("legal.event.receiver") || "—",
                            department: getVal("legal.event.department") || "—",
                            returnDate: getVal("legal.event.returnDate") || "—",
                            description: getVal("dc.description") || "—",
                            raw: itemData
                        });
                    }
                }
            }
            return events;
        } catch (error) {
            console.error("Error in getRelatedCirculationEvents:", error);
            return [];
        }
    }

    async createCirculationEvent(caseFileUuid, eventData) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({
                Accept: "application/json",
                "Content-Type": "application/json",
            });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const caseFile = await this.getItem(caseFileUuid);
            if (!caseFile) throw new Error("CaseFile not found");
            
            const owningCollectionLink = caseFile._links?.owningCollection?.href;
            if (!owningCollectionLink) throw new Error("CaseFile has no owning collection");
            
            const colUuidMatch = owningCollectionLink.match(/collections\/([a-f0-9\-]+)/i);
            if (!colUuidMatch) throw new Error("Could not parse collection UUID");
            const collectionId = colUuidMatch[1];

            const wsItem = await this.createWorkspaceItem(collectionId);
            if (!wsItem) throw new Error("Failed to create workspace item for circulation event");
            const wsItemId = wsItem.id || wsItem.uuid;

            const patchHeaders = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                patchHeaders["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const patchBody = [
                {
                    op: "add",
                    path: "/sections/circulationEventForm/dspace.entity.type",
                    value: [{ value: "CirculationEvent", language: null, authority: null, confidence: -1 }]
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/dc.title",
                    value: [{ value: `Circulation Event - ${eventData.status}`, language: null, authority: null, confidence: -1 }]
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.date",
                    value: [{ value: eventData.eventDate, language: null, authority: null, confidence: -1 }]
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.status",
                    value: [{ value: eventData.status, language: null, authority: null, confidence: -1 }]
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.handover",
                    value: eventData.handover ? [{ value: eventData.handover, language: null, authority: null, confidence: -1 }] : []
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.receiver",
                    value: [{ value: eventData.receiver, language: null, authority: null, confidence: -1 }]
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.department",
                    value: eventData.department ? [{ value: eventData.department, language: null, authority: null, confidence: -1 }] : []
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/legal.event.returnDate",
                    value: eventData.returnDate ? [{ value: eventData.returnDate, language: null, authority: null, confidence: -1 }] : []
                },
                {
                    op: "add",
                    path: "/sections/circulationEventForm/dc.description",
                    value: eventData.description ? [{ value: eventData.description, language: null, authority: null, confidence: -1 }] : []
                }
            ];

            const patchRes = await fetch(`${DSPACE_API_URL}/submission/workspaceitems/${wsItemId}`, {
                method: "PATCH",
                headers: patchHeaders,
                credentials: "include",
                body: JSON.stringify(patchBody),
            });

            if (!patchRes.ok) {
                console.error("Failed to patch circulation event metadata");
            }

            const submittedItem = await this.submitWorkspaceItem(wsItemId);
            if (!submittedItem) throw new Error("Failed to submit circulation event item");
            
            const newEventUuid = submittedItem.item?.uuid || submittedItem.uuid || submittedItem.id;
            if (!newEventUuid) throw new Error("Could not find submitted item UUID");

            const relTypeRes = await fetch(`${DSPACE_API_URL}/core/relationshiptypes`, {
                credentials: "include",
                headers: headers
            });
            let relationshipTypeId = null;
            if (relTypeRes.ok) {
                const relTypesData = await relTypeRes.json();
                const types = relTypesData?._embedded?.relationshiptypes || [];
                const matchedType = types.find(t => 
                    (t.leftType === "CaseFile" && t.rightType === "CirculationEvent") ||
                    (t.leftwardType === "isCaseFileOf" && t.rightwardType === "hasCirculationEvent")
                );
                if (matchedType) {
                    relationshipTypeId = matchedType.id || matchedType.uuid;
                }
            }

            if (!relationshipTypeId) {
                relationshipTypeId = "hasCirculationEvent";
            }

            const relationshipBody = {
                leftItem: `${window.location.protocol}//${window.location.host}/server/api/core/items/${caseFileUuid}`,
                rightItem: `${window.location.protocol}//${window.location.host}/server/api/core/items/${newEventUuid}`,
                relationshipType: `${window.location.protocol}//${window.location.host}/server/api/core/relationshiptypes/${relationshipTypeId}`
            };

            const relPostRes = await fetch(`${DSPACE_API_URL}/core/relationships`, {
                method: "POST",
                headers: headers,
                credentials: "include",
                body: JSON.stringify(relationshipBody),
            });

            if (!relPostRes.ok) {
                console.error("Failed to establish relationship between CaseFile and CirculationEvent:", relPostRes.status);
            }

            return { success: true, item: submittedItem };
        } catch (error) {
            console.error("Error creating circulation event:", error);
            return { success: false, error: error.message };
        }
    }
}

export default new DSpaceService();
