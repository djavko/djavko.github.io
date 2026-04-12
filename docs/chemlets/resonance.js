const main = document.querySelector('main');
const moleculeList = document.getElementById('molecule-list');

let RDKitModule;
initRDKitModule().then(function (instance) {
    RDKitModule = instance;
});

let resonanceData = {};

const initialMoleculeData = (molecule, defaults, conjugatedLonePairs, valenceElectrons) => {
    const valenceElectronsDefault = { 1:1, 6:4, 7:5, 8:6, 15:5 }; // z : electron-count
    // const name = { 1:'H', 6:'C', 7:'N', 8: 'O', 15: 'P' };
    return {
        ...molecule,
        initialCharge: moleculeCharge(molecule),
        atoms: molecule.atoms.map((atom, idx) => {
            const z = Object.keys(atom).includes('z') ? atom.z : defaults.atom.z;
            const chg = Object.keys(atom).includes('chg') ? atom.chg : defaults.atom.chg;
            const impHs = Object.keys(atom).includes('impHs') ? atom.impHs : 0;
            const bonds = molecule.bonds.map((bond, bondIdx) => ({ ...bond, idx: bondIdx })).filter(bond => bond.atoms.includes(idx));
            const adjacentBo = bonds.map(bond => Object.keys(bond).includes('bo') ? bond.bo : defaults.bond.bo).reduce((acc, val) => acc + val) + impHs;
            const totalValenceElectrons = valenceElectrons !== undefined && Object.keys(valenceElectrons).includes(`${idx}`) ?
                valenceElectrons[`${idx}`] + adjacentBo - chg : valenceElectronsDefault[z] + adjacentBo - chg;
            // console.log(`${name[z]} has ${totalValenceElectrons} electrons.`);
            return {
                ...atom,
                z,
                chg,
                bonds: bonds.map(bond => bond.idx),
                totalValenceElectrons,
                name: elements[z],
                conjugatedLonePairs: Object.keys(conjugatedLonePairs).includes(`${idx}`) ? conjugatedLonePairs[`${idx}`] : 0
            }
        }),
        bonds: molecule.bonds.map(bond => ({
            ...bond,
            name: bond.atoms.map(atom=>molecule.atoms[atom]).map(atom=>elements[Object.keys(atom).includes('z') ? atom.z : defaults.atom.z]).join('-'),
            bo: Object.keys(bond).includes('bo') ? bond.bo : defaults.bond.bo
        }))
    };
}

const isBond = target => target.matches('path[class^="bond"]');

const isAtom = target => target.tagName == 'ellipse';

const numConjugatedLonePairs = (molecule, atom) => molecule.atoms[atom].conjugatedLonePairs;

const bondOrder = (molecule, bond) => molecule.bonds[bond].bo;

const moleculeCharge = molecule => molecule.atoms.map(atom=>atom.chg ? atom.chg : 0).reduce((acc, val)=>acc+val);

const totalBondOrder = molecule => molecule.bonds.map(bond => bond.bo).reduce((acc, val)=>acc+val);

const totalAbsCharge = molecule => molecule.atoms.map(atom => Math.abs(atom.chg)).reduce((acc, val)=>acc+val);

const numAtomsWithoutOctet = molecule => molecule.atoms.filter(atom=>atom.z >= 6).map(atom=>atom.totalValenceElectrons != 8).reduce((acc, val) => acc+val);

const structureIsValid = rdkitMol => rdkitMol.is_valid(); //rdkitMol !== null

const isMajorContributor = (molecule, getNumAromaticRings) => {
    // const atomsWithoutOctet = numAtomsWithoutOctet(molecule);
    //  if (moleculeCharge(molecule) == molecule.initialCharge) {
        
        // console.log(numAromaticRings);
    //     console.log(atomsWithoutOctet);
    //     return (atomsWithoutOctet <= molecule.initialNumAtomsWithoutOctet) || ( (numAromaticRings > atomsWithoutOctet) && (numAromaticRings > molecule.initialNumAromaticRings) );
    //  }
    //  return false;
    // const score = numAtomsWithoutOctet(molecule) <= molecule.initialNumAtomsWithoutOctet
    const nawo = numAtomsWithoutOctet(molecule);
    const tbo = totalBondOrder(molecule);
    const tac = totalAbsCharge(molecule);
    if (nawo <= molecule.initialNumAtomsWithoutOctet && tbo >= molecule.initialTotalBondOrder) {
        if (tac <= molecule.initialTotalAbsCharge + 2)
            return true;
        // else if (tac > molecule.initialTotalAbsCharge + 1) // + 1
        //     return false;
        else {
            const numAromaticRings = getNumAromaticRings();
            if (numAromaticRings == molecule.initialNumAromaticRings)
            return true;
        }
    } else {
        const numAromaticRings = getNumAromaticRings();
        if (numAromaticRings > molecule.initialNumAromaticRings && ((tac - molecule.initialTotalAbsCharge) <= (numAromaticRings - molecule.initialNumAromaticRings)))
            return true;
    }
    return false;
}

const encodeContributor = mol => mol.molecules.map(molecule => molecule.atoms.map(atom=>atom.chg).join('') + molecule.bonds.map(bond=>bond.bo).join('')).join('');

const clearError = () => {
    const error = document.querySelector('[error]');
    if (error !== null)
        error.toggleAttribute('error');
}

const lonePairElectronMovementFeedback = (molecule, indexOfOtherAtomInBond) => {
    let feedback = '';
    if (molecule['atoms'][indexOfOtherAtomInBond]['totalValenceElectrons'] > 6)
        feedback = `This ${molecule['atoms'][indexOfOtherAtomInBond].name} atom (highlighted in red) cannot have more than 8 valence electrons.
            Remember the octet rule. Try choosing another bond.`;
    if (molecule['atoms'][indexOfOtherAtomInBond]['name'] == 'H')
        feedback = `Hydrogen atoms cannot have more than 2 valence electrons. Try choosing another bond.`;
    return feedback;
}

const piBondElectronMovementFeedback = (molecule, indexOfOtherAtomInBond) => {
    let feedback = '';
    if (molecule['atoms'][indexOfOtherAtomInBond]['name'] == 'O' && molecule['atoms'][indexOfOtherAtomInBond]['chg'] == 1)
        feedback = `Oxygen atoms cannot have a formal charge greater than +1`;
    return feedback;
}

const handleAtomClick = (event, molecule, refreshSVG, addMajorContributor, getNumAromaticRings) => {
    const atomIdx = parseInt(event.target.classList[0].split('-')[1]);
    const selectedSource = document.querySelector('[electron-source]');
    if (selectedSource !== null) {
        const sourceIdx = parseInt(selectedSource.classList[0].split('-')[1]);
        const indexOfOtherAtomInBond = molecule['bonds'][sourceIdx]['atoms'].filter(atom => atom != atomIdx)[0];
        const feedback = piBondElectronMovementFeedback(molecule, indexOfOtherAtomInBond);
        if (feedback === '') {
            molecule['bonds'][sourceIdx]['bo']--;
            molecule['atoms'][atomIdx]['conjugatedLonePairs']++;
            molecule['atoms'][atomIdx]['chg']--;
            molecule['atoms'][indexOfOtherAtomInBond]['chg']++;
            molecule['atoms'][indexOfOtherAtomInBond]['totalValenceElectrons'] = molecule['atoms'][indexOfOtherAtomInBond]['totalValenceElectrons'] - 2;
            refreshSVG();
            if (isMajorContributor(molecule, getNumAromaticRings)) {
                addMajorContributor() ?
                document.querySelector('#feedback').textContent = 'Excellent. You found another one of the major resonance structures.' :
                document.querySelector('#feedback').textContent = 'This is one of the major resonance structures.';
            } else {
                document.querySelector('#feedback').textContent = 'Good. Again, choose a source of electrons by clicking on it.';
            }
        } else {
            clearError();
            document.querySelector(`ellipse.atom-${indexOfOtherAtomInBond}`).toggleAttribute('error');
            document.querySelector('#feedback').textContent = feedback;
        }
    } else {
        const atom = molecule.atoms[atomIdx];
        clearError();
        if (numConjugatedLonePairs(molecule, atomIdx) >= 1) {
            event.target.toggleAttribute('electron-source');
            document.querySelectorAll('path, ellipse').forEach(elem => {
                elem.toggleAttribute('non-adjacent');
            });

            atom.bonds.forEach(bondIdx => {
                document.querySelectorAll(`path.bond-${bondIdx}`).forEach(
                    bondElem => {bondElem.toggleAttribute('electron-sink')}
                );
                
            });
            document.querySelector('#feedback').textContent = 
            `Good. Now choose an electron sink from the bonds adjacent (highlighted) to this 
            ${atom.name} atom.`;
        } else {
            event.target.toggleAttribute('error');
            document.querySelector('#feedback').textContent = 
            `This ${atom.name} atom is not a valid source since it 
            doesn't have a conjugated lone pair. Try choosing another atom.`;
        }
    }
}

const handleBondClick = (event, molecule, refreshSVG, addMajorContributor, getNumAromaticRings) => {
    
    const bondIdx = parseInt(event.target.classList[0].split('-')[1]);
    const selectedSource = document.querySelector('[electron-source]');
    if (selectedSource !== null) {
        const sourceIdx = selectedSource.classList[0].split('-')[1];
        const indexOfOtherAtomInBond = molecule['bonds'][bondIdx]['atoms'].filter(atomIdx => atomIdx != sourceIdx)[0];
        // Need to check for rdkit structure validity here and probably include more checks.
        // For now, only heavy atoms exceeding 8 valence electrons are prevented.
        const feedback = lonePairElectronMovementFeedback(molecule, indexOfOtherAtomInBond);
        if (feedback === '') {
            molecule['atoms'][sourceIdx]['chg']++;
            molecule['atoms'][sourceIdx]['conjugatedLonePairs']--;
            molecule['bonds'][bondIdx]['bo']++;
            molecule['atoms'][indexOfOtherAtomInBond]['chg']--;
            molecule['atoms'][indexOfOtherAtomInBond]['totalValenceElectrons'] = molecule['atoms'][indexOfOtherAtomInBond]['totalValenceElectrons'] + 2;
            refreshSVG();
            if (isMajorContributor(molecule, getNumAromaticRings)) {
                addMajorContributor() ?
                document.querySelector('#feedback').textContent = 'Excellent. You found another one of the major resonance structures.' :
                document.querySelector('#feedback').textContent = 'This is one of the major resonance structures.';
            } else {
                document.querySelector('#feedback').textContent = 'Good. Again, choose a source of electrons by clicking on it.';
            }
        } else {
            clearError();
            document.querySelector(`ellipse.atom-${indexOfOtherAtomInBond}`).toggleAttribute('error');
            document.querySelector('#feedback').textContent = feedback;
        } 
    } else {
        const bond = molecule.bonds[bondIdx];
        clearError();
        if (bondOrder(molecule, bondIdx) > 1) {
            event.target.toggleAttribute('electron-source');
            document.querySelectorAll('path, ellipse').forEach(elem => {
                elem.toggleAttribute('non-adjacent');
            });
            bond.atoms.forEach(atomIdx => document.querySelector(`ellipse.atom-${atomIdx}`).toggleAttribute('electron-sink'));

            document.querySelector('#feedback').textContent = 
            `Good. Now choose an electron sink from the atoms adjacent (highlighted) to this 
            ${bond.name} bond.`;
        } else {
            event.target.toggleAttribute('error');
            document.querySelector('#feedback').textContent = 
            `This ${bond.name} bond is not a valid source since it doesn't have π electrons. Try choosing another bond.`;
        }
    }
}

const loadMoleculeWithRDKit = ({ molblock, resonanceData }) => {
    const { name: moleculeName, conjugatedLonePairs, valenceElectrons } = resonanceData;
    let rdkitMol = RDKitModule.get_mol(molblock, JSON.stringify({ sanitize: false }));//, JSON.stringify({sanitize: true, removeHs: false}));
    let mol = JSON.parse(rdkitMol.get_json());
    mol.molecules = mol.molecules.map(molecule => initialMoleculeData(molecule, mol.defaults, conjugatedLonePairs, valenceElectrons));
    mol.molecules[0].initialNumAromaticRings = JSON.parse(RDKitModule.get_mol(molblock).get_descriptors()).NumAromaticRings;
    mol.molecules.forEach(molecule => {
        molecule.initialNumAtomsWithoutOctet = numAtomsWithoutOctet(molecule);
        molecule.initialTotalBondOrder = totalBondOrder(molecule);
        molecule.initialTotalAbsCharge = totalAbsCharge(molecule);
    });
    
    let resonanceContributors = new Set([encodeContributor(mol)]);

    const bonds = JSON.parse(rdkitMol.get_json())['molecules'][0].bonds.map((_,i)=>i);
    const atoms = JSON.parse(rdkitMol.get_json())['molecules'][0].atoms.map((_,i)=>i);
    const dest = document.getElementById("molecule");
    const mdetails = {};
    mdetails['bonds'] = bonds;
    mdetails['atoms'] = atoms;
    mdetails['legend'] = moleculeName;
    // mdetails['addAtomIndices'] = true;
    mdetails['highlightColour'] = [1,1,1];
    mdetails['width'] = resonanceData.width;
    mdetails['height'] = resonanceData.height;
    mdetails['highlightBondWidthMultiplier'] = 16; 

    dest.innerHTML= rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));
    const contributorsDiv = document.getElementById('resonance-contributors');
    contributorsDiv.innerHTML = `<div>${rdkitMol.get_svg()}</div>`;

    const getNumAromaticRings = () => JSON.parse(RDKitModule.get_mol(JSON.stringify(mol)).get_descriptors()).NumAromaticRings;

    const refreshSVG = () => {
        rdkitMol = RDKitModule.get_mol(JSON.stringify(mol), JSON.stringify({ sanitize: false }));
        dest.innerHTML = rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));
    }

    const addMajorContributor = () => {
        if (resonanceContributors.size < resonanceContributors.add(encodeContributor(mol)).size) {
            const arrow = document.createElement('div');
            arrow.className = 'resonance-arrow';
            arrow.innerHTML = '&harr;'
            let molDiv = document.createElement('div');
            molDiv.innerHTML = rdkitMol.get_svg();
            contributorsDiv.append(arrow, molDiv);
            return true;
        }
        return false;
    }

    document.querySelector('#feedback').textContent = 'Choose a source of electrons in the structure above by clicking on it.';

    const main = document.querySelector('main');
    document.getElementById('initial-selection').setAttribute('hidden','');
    document.getElementById('after-selection').removeAttribute('hidden');

    const handleMoleculeInteraction = event => {
        if (isAtom(event.target)) {
            handleAtomClick(event, mol.molecules[0], refreshSVG, addMajorContributor, getNumAromaticRings);
        } else if (isBond(event.target)) {
            handleBondClick(event, mol.molecules[0], refreshSVG, addMajorContributor, getNumAromaticRings);
        } else if (document.querySelector('[electron-source]') !== null) {
            refreshSVG();
            document.querySelector('#feedback').textContent = 'Choose a source of electrons in the structure above by clicking on it.';
        } else if (event.target.id == 'select-another') {
            const selected = document.querySelector('.selected');
            selected.classList.remove('selected');
            document.getElementById('initial-selection').removeAttribute('hidden');
            document.getElementById('after-selection').setAttribute('hidden','');
            main.removeEventListener('click', handleMoleculeInteraction);
        }
    }
    
    main.addEventListener('click', handleMoleculeInteraction);
}

const handleMolFileData = molFileRequest => {
    if (molFileRequest.readyState === XMLHttpRequest.DONE) {
        if (molFileRequest.status === 200) {
            const molFile = molFileRequest.responseText;
            const selectedMolecule = document.querySelector('.selected');
            const moleculeName = selectedMolecule.textContent;
            loadMoleculeWithRDKit({ 
                molblock: molFile, 
                resonanceData: resonanceData[moleculeName],
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleResonanceData = () => {
    if (resonanceDataRequest.readyState === XMLHttpRequest.DONE) {
        if (resonanceDataRequest.status === 200) {
            const resonanceDataResponse = JSON.parse(resonanceDataRequest.responseText);
            resonanceDataResponse.molecules.forEach(molecule => {
                const li = document.createElement('li');
                li.className = 'molecule';
                li.setAttribute('fileName', molecule.fileName);
                li.textContent = molecule.name;
                moleculeList.append(li);
                resonanceData[molecule.name] = molecule;
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleSelectMolecule = event => {
    if (event.target.classList.contains('molecule')) {
        const molFileRequest = new XMLHttpRequest();
        molFileRequest.onreadystatechange = () => handleMolFileData(molFileRequest);
        event.target.classList.add('selected');
        const fileName = event.target.getAttribute('fileName');
        molFileRequest.open("GET", `molfiles/${fileName}`);
        molFileRequest.send();
    }
}

main.addEventListener('click', handleSelectMolecule);

const resonanceDataRequest = new XMLHttpRequest();
resonanceDataRequest.onreadystatechange = handleResonanceData;
resonanceDataRequest.open("GET", "resonance/resonance_data.json");
resonanceDataRequest.send();

