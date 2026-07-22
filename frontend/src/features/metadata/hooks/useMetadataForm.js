import { useState, useEffect } from "react";
import dspaceService from "../../../services/dspaceService";

export const useMetadataForm = () => {
  const [collections, setCollections] = useState([]);
  const [collectionId, setCollectionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [fileNumber, setFileNumber] = useState("");
  const [fileNumberStatus, setFileNumberStatus] = useState("idle");
  const [activeEntityType, setActiveEntityType] = useState("");
  
  const [plaintiffs, setPlaintiffs] = useState([""]);
  const [defendants, setDefendants] = useState([""]);
  const [caseRepresentatives, setCaseRepresentatives] = useState([""]);
  
  const [manualEthioDate, setManualEthioDate] = useState("");

  const [extraFields, setExtraFields] = useState({
    branchLocation: "",
    region: "",
    registrationDate: "",
    registrationAmDate: "",
    giverType: "",
    receiverType: "",
    femaleCount: "",
    maleCount: "",
    caseType: "",
    vehicleLibre: "",
    vehiclePlate: "",
    vehicleChassis: "",
    vehicleMotor: "",
    propertyCarta: "",
    propertyCartaDate: "",
    propertyHouseNumber: "",
    propertyArea: "",
    estimatedValue: "",
    saleValue: "",
    loanAmount: "",
    loanStartDate: "",
    loanEndDate: "",
    organizationName: "",
    organizationType: "",
    tin: "",
    phone: "",
    totalContribution: "",
    totalShares: "",
    capital: "",
    meetingAgenda: "",
    meetingPlace: "",
    meetingTime: "",
    meetingDecision: "",
    revokedNumber: "",
    city: "",
    subcity: "",
    woreda: "",
    kebele: "",
    dataEncoderName: "",
    investigatorName: "",
    stampOfficerName: "",
  });

  const updateExtraField = (field, value) => {
    setExtraFields(prev => ({ ...prev, [field]: value }));
  };

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("metadataEditorState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.collectionId) setCollectionId(parsed.collectionId);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.fileNumber) setFileNumber(parsed.fileNumber);
        if (parsed.plaintiffs) setPlaintiffs(parsed.plaintiffs);
        if (parsed.defendants) setDefendants(parsed.defendants);
        if (parsed.caseRepresentatives) setCaseRepresentatives(parsed.caseRepresentatives);
        if (parsed.manualEthioDate) setManualEthioDate(parsed.manualEthioDate);
        if (parsed.extraFields) setExtraFields(parsed.extraFields);
      } catch (e) {
        console.error("Failed to parse cached metadata", e);
      }
    }
  }, []);

  // Check file number exists
  useEffect(() => {
    if (!dspaceService.isAuthenticated && !dspaceService.getStoredToken()) {
      setFileNumberStatus("idle");
      return;
    }
    if (!fileNumber || fileNumber.trim() === "") {
      setFileNumberStatus("idle");
      return;
    }
    setFileNumberStatus("checking");
    let isCurrent = true;
    const timer = setTimeout(async () => {
      const currentFileNumber = fileNumber.trim();
      const exists = await dspaceService.checkFileNumberExists(currentFileNumber);
      if (!isCurrent) return;
      if (exists) {
        setFileNumberStatus("duplicate");
      } else {
        setFileNumberStatus("valid");
      }
    }, 500);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [fileNumber]);

  // Save to local storage
  useEffect(() => {
    const stateToSave = {
      collectionId,
      title,
      description,
      fileNumber,
      activeEntityType,
      plaintiffs,
      defendants,
      caseRepresentatives,
      manualEthioDate,
      extraFields,
    };
    localStorage.setItem("metadataEditorState", JSON.stringify(stateToSave));
  }, [
    collectionId,
    title,
    description,
    fileNumber,
    activeEntityType,
    plaintiffs,
    defendants,
    caseRepresentatives,
    manualEthioDate,
    extraFields,
  ]);

  // Fetch collections
  useEffect(() => {
    const fetchDspaceCollections = async () => {
      try {
        const fetchedCollections = await dspaceService.getCollections();
        setCollections(fetchedCollections);
      } catch (error) {
        console.error("Failed to fetch DSpace collections:", error);
      }
    };
    fetchDspaceCollections();
  }, []);

  // Handle Collection ID changes (Active Entity Type)
  useEffect(() => {
    if (!collectionId) {
      setActiveEntityType("");
    } else {
      const selectedCollection = collections.find((c) => c.uuid === collectionId);
      if (selectedCollection) {
        let type = "";
        if (selectedCollection._embedded?.entityType) {
            type = selectedCollection._embedded.entityType.label || selectedCollection._embedded.entityType.id || "";
        } else if (selectedCollection.metadata && selectedCollection.metadata["dspace.entity.type"]) {
            type = selectedCollection.metadata["dspace.entity.type"][0].value;
        } else {
            const name = selectedCollection.name || "";
            if (name.includes("Vehicle Sales")) type = "VehicleSale";
            else if (name.includes("Real Estate Sales")) type = "HouseSale";
            else if (name.includes("Vehicle Gifts")) type = "VehicleGift";
            else if (name.includes("Property Gifts")) type = "HouseGift";
            else if (name.includes("Unsecured Loans")) type = "LoanUnsecured";
            else if (name.includes("Secured Loans")) type = "LoanSecured";
            else if (name.includes("Power of Attorney")) type = "PowerOfAttorney";
            else if (name.includes("Wills")) type = "Will";
            else if (name.includes("Corporate")) type = "CorporateArticles";
        }
        setActiveEntityType(type);
      }
    }
  }, [collectionId, collections]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFileNumber("");
    setPlaintiffs([""]);
    setDefendants([""]);
    setCaseRepresentatives([""]);
    setManualEthioDate("");
    setExtraFields({
        branchLocation: "", region: "", registrationDate: "", registrationAmDate: "", giverType: "", receiverType: "", femaleCount: "", maleCount: "", caseType: "", vehicleLibre: "", vehiclePlate: "", vehicleChassis: "", vehicleMotor: "", propertyCarta: "", propertyCartaDate: "", propertyHouseNumber: "", propertyArea: "", estimatedValue: "", saleValue: "", loanAmount: "", loanStartDate: "", loanEndDate: "", organizationName: "", organizationType: "", tin: "", phone: "", totalContribution: "", totalShares: "", capital: "", meetingAgenda: "", meetingPlace: "", meetingTime: "", meetingDecision: "", revokedNumber: "", city: "", subcity: "", woreda: "", kebele: "", dataEncoderName: "", investigatorName: "", stampOfficerName: "",
    });
  };

  return {
    collections,
    collectionId, setCollectionId,
    title, setTitle,
    description, setDescription,
    fileNumber, setFileNumber,
    fileNumberStatus,
    activeEntityType,
    plaintiffs, setPlaintiffs,
    defendants, setDefendants,
    caseRepresentatives, setCaseRepresentatives,
    manualEthioDate, setManualEthioDate,
    extraFields, setExtraFields,
    updateExtraField,
    resetForm
  };
};
