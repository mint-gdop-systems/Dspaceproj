// Use proxy to avoid CORS issues - proxy forwards /api/dspace to http://localhost:8080/server/api
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

    async _fetch(url, options) {
        const response = await fetch(url, options);
        
        // Extract token
        const authHeader = response.headers.get('Authorization') || response.headers.get('authorization');
        if (authHeader) {
            this.authToken = authHeader;
            localStorage.setItem('dspaceAuthToken', authHeader);
        }
        
        // Extract CSRF token
        const csrfToken = response.headers.get('DSPACE-XSRF-TOKEN') || 
                          response.headers.get('XSRF-TOKEN') || 
                          response.headers.get('X-XSRF-TOKEN');
        if (csrfToken) {
            this.csrfToken = csrfToken;
        }

        return response;
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

            const response = await this._fetch(`${DSPACE_API_URL}/authn/status`, {
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

    isTokenExpired(bufferMs = 0) {
        const token = this.getStoredToken();
        if (!token) return true;

        const expirationTime = readTokenExpiration(token);
        if (!expirationTime) return true;

        return Date.now() + bufferMs >= expirationTime;
    }

    async refreshAuthentication() {
        const currentToken = this.getStoredToken();
        if (!currentToken) {
            this.isAuthenticated = false;
            return { authenticated: false };
        }

        const headers = this.getCsrfHeaders({ Accept: "application/json" });
        headers["Authorization"] = currentToken.startsWith("Bearer ") ? currentToken : `Bearer ${currentToken}`;

        try {
            const response = await this._fetch(`${DSPACE_API_URL}/authn/login`, {
                method: "POST",
                credentials: "include",
                headers: headers,
            });

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
        } catch (error) {
            this.isAuthenticated = false;
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
            
            const response = await this._fetch(`${DSPACE_API_URL}/core/collections?embed=entityType`, {
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
        add("legal.date.registrationAm", metadata.registrationAmDate);
        // add("legal.case.level", metadata.caseLevel);
        add("legal.lowerCourt.fileNumber", metadata.lowerCourtFileNumber);
        add("legal.case.status", metadata.caseStatus);
        add("legal.location", metadata.location);
        add("legal.bench.session", metadata.benchSession);
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
        const res1 = await this._fetch(url1, {
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
            const res2 = await this._fetch(url2, {
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

            const response = await this._fetch(
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
                "dc.title": metadata.title,
                "dars.document.number": metadata.documentNumber,
                "dars.document.date": metadata.contractDate,
                "dars.branch.location": metadata.branchLocation,
                "dars.spatial.region": metadata.region,
                "dars.spatial.city": metadata.city,
                "dars.spatial.subcity": metadata.subcity,
                "dars.spatial.woreda": metadata.woreda,
                "dars.spatial.kebele": metadata.kebele,

                "dars.giver.name": metadata.giverName,
                "dars.giver.type": metadata.giverType,
                "dars.receiver.name": metadata.receiverName,
                "dars.receiver.type": metadata.receiverType,
                "dars.demographics.femaleCount": metadata.femaleCount,
                "dars.demographics.maleCount": metadata.maleCount,

                "dars.service.type": metadata.serviceType,
                "dars.case.type": metadata.caseType,

                "dars.vehicle.libre": metadata.vehicleLibre,
                "dars.vehicle.plate": metadata.vehiclePlate,
                "dars.vehicle.chassis": metadata.vehicleChassis,
                "dars.vehicle.motor": metadata.vehicleMotor,

                "dars.property.carta": metadata.propertyCarta,
                "dars.property.cartaDate": metadata.propertyCartaDate,
                "dars.property.houseNumber": metadata.propertyHouseNumber,
                "dars.property.area": metadata.propertyArea,

                "dars.financial.estimatedValue": metadata.estimatedValue,
                "dars.financial.saleValue": metadata.saleValue,
                "dars.financial.capital": metadata.capital,
                "dars.financial.totalContribution": metadata.totalContribution,
                "dars.financial.totalShares": metadata.totalShares,
                "dars.loan.startDate": metadata.loanStartDate,
                "dars.loan.endDate": metadata.loanEndDate,
                "dars.loan.amount": metadata.loanAmount,

                "dars.organization.name": metadata.organizationName,
                "dars.organization.type": metadata.organizationType,
                "dars.organization.tin": metadata.tin,
                "dars.contact.phone": metadata.phone,

                "dars.meeting.agenda": metadata.meetingAgenda,
                "dars.meeting.place": metadata.meetingPlace,
                "dars.meeting.time": metadata.meetingTime,
                "dars.meeting.decision": metadata.meetingDecision,

                "dars.document.revokedNumber": metadata.revokedNumber,

                "dars.officer.name": metadata.officerName,
                "dars.dataEncoder.name": metadata.dataEncoderName,
                "dars.investigator.name": metadata.investigatorName,
                "dars.stampOfficer.name": metadata.stampOfficerName,
            };

            for (const [field, raw] of Object.entries(dcFields)) {
                if (!raw) continue;
                const vals = Array.isArray(raw) ? raw : [raw];
                const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);

                if (cleaned.length > 0) {
                    metadataUpdates.push({
                        op: "replace",
                        path: field,
                        value: cleaned.map(v => ({ value: v }))
                    });
                }
            }

            const FIELD_SECTION_MAP = {
                "dc.title": "darisCommonPageOne",
                "dars.document.number": "darisCommonPageOne",
                "dars.document.date": "darisCommonPageOne",
                "dars.branch.location": "darisCommonPageOne",
                "dars.document.attachments": "darisCommonPageOne",
                "dars.document.revokedNumber": "revocationForm",
                
                "dars.giver.name": "darisCommonPageTwo",
                "dars.giver.type": "darisCommonPageTwo",
                "dars.receiver.name": "darisCommonPageTwo",
                "dars.receiver.type": "darisCommonPageTwo",
                "dars.demographics.femaleCount": "darisCommonPageOne",
                "dars.demographics.maleCount": "darisCommonPageOne",
                "dars.organization.name": "corporateArticlesForm",
                "dars.organization.type": "corporateArticlesForm",
                "dars.organization.tin": "corporateArticlesForm",
                "dars.contact.phone": "corporateArticlesForm",

                "dars.officer.name": "darisCommonPageThree",
                "dars.dataEncoder.name": "darisCommonPageThree",
                "dars.investigator.name": "darisCommonPageThree",
                "dars.stampOfficer.name": "darisCommonPageThree",
            };

            // Dynamic Asset Forms mapping (simplified, defaults to specific form if not in common pages)
            const getSectionForField = (field, metadata) => {
                if (FIELD_SECTION_MAP[field]) return FIELD_SECTION_MAP[field];
                
                // Common dynamic fallback for spatial fields depending on entity type
                if (field.startsWith("dars.spatial.")) {
                     if (metadata.activeEntityType === "CorporateArticles") return "corporateArticlesForm";
                     return metadata.activeEntityType === "HouseGift" ? "propertyGiftForm" : "propertySaleForm";
                }
                
                if (field === "dars.case.type") {
                    if (metadata.activeEntityType === "VehicleGift") return "vehicleGiftForm";
                    if (metadata.activeEntityType === "VehicleSale") return "vehicleSaleForm";
                    if (metadata.activeEntityType === "HouseGift") return "propertyGiftForm";
                    if (metadata.activeEntityType === "HouseSale") return "propertySaleForm";
                    if (metadata.activeEntityType === "LoanUnsecured" || metadata.activeEntityType === "LoanSecured") return "loanForm";
                    if (metadata.activeEntityType === "PowerOfAttorney" || metadata.activeEntityType === "POARevocation" || metadata.activeEntityType === "LoanClearance") return "revocationForm";
                    if (metadata.activeEntityType === "CorporateArticles") return "corporateArticlesForm";
                    if (metadata.activeEntityType === "CorporateMinutes") return "corporateMinutesForm";
                    return "darisCommonPageOne";
                }

                // Route dynamic fields based on entity type
                if (field.startsWith("dars.vehicle.")) {
                    return metadata.activeEntityType === "VehicleGift" ? "vehicleGiftForm" : "vehicleSaleForm";
                }
                if (field.startsWith("dars.property.")) {
                    return metadata.activeEntityType === "HouseGift" ? "propertyGiftForm" : "propertySaleForm";
                }
                if (field === "dars.financial.saleValue") {
                    if (metadata.activeEntityType === "HouseSale") return "propertySaleForm";
                    if (metadata.activeEntityType === "VehicleSale") return "vehicleSaleForm";
                    return "loanForm";
                }
                if (field === "dars.financial.estimatedValue") {
                    if (metadata.activeEntityType === "HouseGift") return "propertyGiftForm";
                    if (metadata.activeEntityType === "HouseSale") return "propertySaleForm";
                    if (metadata.activeEntityType === "VehicleGift") return "vehicleGiftForm";
                    if (metadata.activeEntityType === "VehicleSale") return "vehicleSaleForm";
                    return "loanForm";
                }
                if (field === "dars.financial.capital" || field === "dars.financial.totalContribution" || field === "dars.financial.totalShares") {
                    return "corporateArticlesForm";
                }
                if (field.startsWith("dars.loan.")) {
                    return "loanForm";
                }
                if (field.startsWith("dars.meeting.")) return "corporateMinutesForm";
                if (field.startsWith("dars.organization.") || field.startsWith("dars.contact.")) return "corporateArticlesForm";
                
                return "darisCommonPageOne";
            };

            // Determine allowed sections based on activeEntityType to avoid invalid path errors on DSpace
            const allowedSections = new Set([
                "darisCommonPageOne",
                "darisCommonPageTwo",
                "darisCommonPageThree"
            ]);
            if (metadata.activeEntityType === "VehicleSale") allowedSections.add("vehicleSaleForm");
            else if (metadata.activeEntityType === "VehicleGift") allowedSections.add("vehicleGiftForm");
            else if (metadata.activeEntityType === "HouseSale") allowedSections.add("propertySaleForm");
            else if (metadata.activeEntityType === "HouseGift") allowedSections.add("propertyGiftForm");
            else if (metadata.activeEntityType === "LoanUnsecured" || metadata.activeEntityType === "LoanSecured") allowedSections.add("loanForm");
            else if (metadata.activeEntityType === "PowerOfAttorney") allowedSections.add("poaForm");
            else if (metadata.activeEntityType === "POARevocation" || metadata.activeEntityType === "LoanClearance") allowedSections.add("revocationForm");
            else if (metadata.activeEntityType === "CorporateArticles") allowedSections.add("corporateArticlesForm");
            else if (metadata.activeEntityType === "CorporateMinutes") allowedSections.add("corporateMinutesForm");

            // Bundle all fields into a single PATCH request for performance
            const patchOps = [];
            for (const update of metadataUpdates) {
                const field = update.path;
                const section = getSectionForField(field, metadata);
                
                if (!allowedSections.has(section)) {
                    console.warn(`Ignoring field ${field} because section ${section} is not active for entity type ${metadata.activeEntityType}`);
                    continue;
                }

                patchOps.push({
                    op: "add",
                    path: `/sections/${section}/${field}`,
                    value: update.value.map(v => ({
                        value: v.value,
                        language: null,
                        authority: null,
                        confidence: -1
                    }))
                });
            }

            if (patchOps.length === 0) return true;

            console.log("DSpace 9: Sending batched metadata update...", JSON.stringify(patchOps, null, 2));
            
            const response = await this._fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                method: "PATCH",
                headers: baseHeaders,
                credentials: "include",
                body: JSON.stringify(patchOps),
            });

            if (!response.ok) {
                let errorMsg = `Batch metadata update failed (${response.status})`;
                try {
                    const errorObj = await response.json();
                    if (errorObj.message) {
                        errorMsg += `: ${errorObj.message}`;
                    }
                } catch (e) { }
                console.error("- Error patching metadata:", errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log("- Successfully patched metadata");

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

            const response = await this._fetch(
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
                patch.push({ op: "replace", path: "/metadata/dc.title", value: [{ value: metadata.title, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.type) {
                patch.push({ op: "add", path: "/metadata/legal.document.type", value: [{ value: metadata.type, language: null, authority: null, confidence: -1 }] });
            }
            if (metadata.pageCount) {
                patch.push({ op: "add", path: "/metadata/legal.document.pageCount", value: [{ value: metadata.pageCount, language: null, authority: null, confidence: -1 }] });
            }
            // if (metadata.status) {
            //     patch.push({ op: "add", path: "/metadata/legal.document.status", value: [{ value: metadata.status, language: null, authority: null, confidence: -1 }] });
            // }
            if (metadata.description) {
                patch.push({ op: "add", path: "/metadata/dc.description", value: [{ value: metadata.description, language: null, authority: null, confidence: -1 }] });
            }

            if (patch.length === 0) return true;

            const url = `${DSPACE_API_URL}/core/bitstreams/${bitstreamUuid}`;
            console.log(`DSpace 9: Patching bitstream metadata at ${url}`);

            const response = await this._fetch(url, {
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

    async setWorkspaceItemPrimaryBitstream(workspaceItemId, bitstreamUuid) {
        try {
            const token = this.getStoredToken();
            const headers = this.getCsrfHeaders({
                "Content-Type": "application/json-patch+json",
                Accept: "application/json",
            });
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const patchOp = [
                {
                    op: "add",
                    path: "/sections/upload/primary",
                    value: bitstreamUuid
                }
            ];

            const response = await this._fetch(`${DSPACE_API_URL}/submission/workspaceitems/${workspaceItemId}`, {
                method: "PATCH",
                headers: headers,
                credentials: "include",
                body: JSON.stringify(patchOp),
            });

            if (response.ok) {
                console.log(`Successfully set primary bitstream ${bitstreamUuid} for workspace item ${workspaceItemId}`);
                return true;
            }
            
            console.error("Failed to set primary bitstream on workspace item:", await response.text());
            return false;
        } catch (error) {
            console.error("Error in setWorkspaceItemPrimaryBitstream:", error);
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

            const response = await this._fetch(`${DSPACE_API_URL}/workflow/workflowitems`, {
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

    async searchItems(query, limit = 20) {
        try {
            const params = new URLSearchParams({
                query: query || "*",
                dsoType: "item",
                page: "0",
                size: String(limit)
            });
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const response = await this._fetch(`${DSPACE_API_URL}/discover/search/objects?${params}`, {
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

    buildExactMetadataQuery(field, value) {
        const escapedValue = String(value)
            .trim()
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"');
        return `${field}:"${escapedValue}"`;
    }

    async getSearchTotal(query = "*", options = {}) {
        try {
            const params = new URLSearchParams({
                query: query || "*",
                dsoType: "item",
                page: "0",
                size: "1",
            });
            if (options.configuration) {
                params.set("configuration", options.configuration);
            }
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const response = await this._fetch(`${DSPACE_API_URL}/discover/search/objects?${params}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.ok) {
                const data = await response.json();
                return data._embedded?.searchResult?.page?.totalElements || 0;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    async checkFileNumberExists(fileNumber) {
        const normalizedFileNumber = String(fileNumber || "").trim();
        if (!normalizedFileNumber) return false;
        try {
            const endpointResult = await this.checkFileNumberExistsViaEndpoint(normalizedFileNumber);
            if (endpointResult !== null) {
                return endpointResult;
            }

            const query = this.buildExactMetadataQuery("dars.document.number", normalizedFileNumber);
            const totals = await Promise.all([
                // Archived/public item index.
                this.getSearchTotal(query),
                // DSpace 9 in-progress indexes. workflowAdmin is the global admin workflow view;
                // workflow/workspace catch what the current user is allowed to see.
                this.getSearchTotal(query, { configuration: "workspace" }),
                this.getSearchTotal(query, { configuration: "workflow" }),
                this.getSearchTotal(query, { configuration: "workflowAdmin" }),
            ]);
            return totals.some((total) => total > 0);
        } catch (error) {
            console.error("Error checking file number existence", error);
            return false;
        }
    }

    async checkFileNumberExistsViaEndpoint(fileNumber) {
        try {
            const params = new URLSearchParams({ fileNumber });
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }

            const response = await this._fetch(`${DSPACE_API_URL}/dars/document/exists?${params}`, {
                credentials: "include",
                headers: headers,
            });

            if (response.status === 404 || response.status === 405) {
                return null;
            }
            if (!response.ok) {
                throw new Error(`File number endpoint failed: ${response.status}`);
            }

            const data = await response.json();
            return data.exists === true;
        } catch (error) {
            console.warn("Falling back to Discovery duplicate check", error);
            return null;
        }
    }

    async getItem(itemId) {
        try {
            const headers = this.getCsrfHeaders({ Accept: "application/json" });
            const token = this.getStoredToken();
            if (token) {
                headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
            }
            const response = await this._fetch(`${DSPACE_API_URL}/core/items/${itemId}`, {
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
            await this._fetch(`${DSPACE_API_URL}/authn/logout`, { method: "POST", credentials: "include", headers: headers });
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
            const response = await this._fetch(url, {
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

            const response = await this._fetch(
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

            const response = await this._fetch(
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

            const response = await this._fetch(`${DSPACE_API_URL}${url}`, {
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

            const response = await this._fetch(`${DSPACE_API_URL}${url}`, {
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

            const response = await this._fetch(
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
                    
                    const itemResponse = await this._fetch(`${DSPACE_API_URL}${relativePath}`, {
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

            const patchRes = await this._fetch(`${DSPACE_API_URL}/submission/workspaceitems/${wsItemId}`, {
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

            const relTypeRes = await this._fetch(`${DSPACE_API_URL}/core/relationshiptypes`, {
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

            const relPostRes = await this._fetch(`${DSPACE_API_URL}/core/relationships`, {
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
