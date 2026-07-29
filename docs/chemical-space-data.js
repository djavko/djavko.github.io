const CHEMICAL_SPACE_DATA_URL = '/chemical-space-compounds.json';

const fetchChemicalSpaceCompounds = async () => {
    try {
        const response = await fetch(CHEMICAL_SPACE_DATA_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch chemical space data: ${response.status} ${response.statusText}`);
        }
        const compounds = await response.json();
        return Array.isArray(compounds) ? compounds : [];
    } catch (error) {
        console.warn('fetchChemicalSpaceCompounds error:', error);
        return [];
    }
};

window.fetchChemicalSpaceCompounds = fetchChemicalSpaceCompounds;
