const main = document.querySelector('main');
const moleculeList = document.getElementById('molecule-list');

let RDKitModule;
initRDKitModule().then(function (instance) {
    RDKitModule = instance;
});

let protonationData = {};
const loadMoleculeWithRDKit = ({ molblock, protonationData }) => {

    const { protonation } = protonationData;
    const protonationAtoms = protonation.map(entry=>entry.atoms).flat();
    protonation.forEach(entry=>entry.pKas.sort((a,b)=>a-b));
    const atomToGroupIdx = Object.fromEntries(protonation.map((entry, groupIdx) => entry.atoms.map(atomIdx => [atomIdx, groupIdx])).flat());
    const pKaValues = protonation.map(entry=>entry.pKas).flat();
    const max_pKa = 14;//Math.min(Math.max(...pKaValues), 14);
    const min_pKa = 0.1;//Math.max(Math.min(...pKaValues), 0) + 0.1;
    let pH = (Math.random() * (max_pKa - min_pKa) + min_pKa).toFixed(2);
    while (pKaValues.includes(pH))
        pH = (Math.random() * (max_pKa - min_pKa) + min_pKa).toFixed(2);

    document.getElementById('problem-statement').textContent = `What is the prevalent protonation state of ${protonationData.name} in an aqueous solution at pH ${pH}?`;
    let rdkitMol = RDKitModule.get_mol(molblock);

    let mol = JSON.parse(rdkitMol.get_json());
    const molecule = mol.molecules[0];

    molecule.atoms.forEach(atom => {
        if(!Object.keys(atom).includes('z')) atom['z'] = mol.defaults.atom.z;
        if(!Object.keys(atom).includes('chg')) atom['chg'] = mol.defaults.atom.chg;
        if(!Object.keys(atom).includes('impHs')) atom['impHs'] = mol.defaults.atom.impHs;
        atom['initialChg'] = atom['chg'];
    });

    const atoms = JSON.parse(rdkitMol.get_json())['molecules'][0].atoms.map((_,i)=>i);

    const mdetails = {};
    mdetails['atoms'] = atoms;
    mdetails['legend'] = protonationData.name;
    // mdetails['addAtomIndices'] = true;
    mdetails['highlightColour'] = [1,1,1];
    mdetails['width'] = protonationData.width;
    mdetails['height'] = protonationData.height;
    mdetails['highlightRadius'] = 0.5;
    mdetails['useMolBlockWedging'] = true;

    const moleculeDiv = document.getElementById("molecule");
    const molblockBondSection = molblock.slice(molblock.indexOf('M  V30 BEGIN BOND'));

    const getAtomIdx = target => parseInt(target.classList[0].split('-')[1]);

    const refreshSVG = mdetails => {
        // console.log(molecule);
        rdkitMol = RDKitModule.get_mol(JSON.stringify(mol), JSON.stringify({ sanitize: false, kekulize: false, removeHs: false }));
        const block = rdkitMol.get_v3Kmolblock();
        rdkitMol = RDKitModule.get_mol(block.slice(0,block.indexOf('M  V30 END ATOM')+16).concat(molblockBondSection));
        moleculeDiv.innerHTML = rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));
        
        let atomHighlights = moleculeDiv.querySelectorAll('ellipse');
        for (let i = 0; i < atoms.length; i++) {
            atomHighlights[i].classList.add('atom-highlight');
            const atomIdx = getAtomIdx(atomHighlights[i]);
            if (!protonationData.exclude.includes(atomIdx)) {
                atomHighlights[i].classList.add('selectable');
                const groupIdx = atomToGroupIdx[atomIdx];
                if (groupIdx != undefined) atomHighlights[i].setAttribute('group', `${groupIdx}`);
            }
        }
    }

    refreshSVG(mdetails);

    const feedback = document.getElementById('feedback');
    feedback.textContent = `Identify atoms from acidic and basic functional groups in the molecule and click on them to toggle their protonation state. Once finished, 
    click on "Verify answer".`


    const isHeteroatom = atomIdx => molecule.atoms[atomIdx].z == undefined ? false : molecule.atoms[atomIdx].z > 1 && molecule.atoms[atomIdx].z != 6;


    const toggleProtonation = atomIdx => {
        if (molecule.atoms[atomIdx].chg == 1) {
            if (molecule.atoms[atomIdx].impHs >= 2) {
                molecule.atoms[atomIdx].impHs = molecule.atoms[atomIdx].impHs - 2;
                molecule.atoms[atomIdx].chg = molecule.atoms[atomIdx].chg - 2;
            } else if (molecule.atoms[atomIdx].impHs == 1) {
                    molecule.atoms[atomIdx].impHs--;
                    molecule.atoms[atomIdx].chg--;
            }
        } else {
            if (molecule.atoms[atomIdx].chg == -1 || molecule.atoms[atomIdx].chg == 0) {
                molecule.atoms[atomIdx].impHs++;
                molecule.atoms[atomIdx].chg++;
            }
        }
    }

    const main = document.querySelector('main');

    const handleMoleculeInteraction = event => {
        const isAtom = event.target.classList.contains('selectable');
        if (isAtom) {
            const atomIdx = getAtomIdx(event.target);
            if (isHeteroatom(atomIdx)) {
                toggleProtonation(atomIdx);
                refreshSVG(mdetails);
                feedback.textContent = '';
            } else {
                document.querySelectorAll('.atom-highlight').forEach(elem => {
                    if (elem.hasAttribute('error')) elem.removeAttribute('error');
                });
                event.target.toggleAttribute('error');
                feedback.textContent  = `The atom selected is not a heteroatom. Try clicking on another atom.`;
            }
        }
        if (event.target.id == "check-answer") {
            event.target.setAttribute('disabled', '');
            let answerIsCorrect = true;
            document.querySelectorAll('.atom-highlight.selectable:not([group])').forEach(elem => {
                if (elem.hasAttribute('error'))
                    elem.toggleAttribute('error');
                elem.classList.remove('selectable');
                const atomIdx = getAtomIdx(elem);
                if(isHeteroatom(atomIdx)) {
                    if (!protonationAtoms.includes(atomIdx)) {
                        if (molecule.atoms[atomIdx].chg == molecule.atoms[atomIdx].initialChg) {
                            elem.classList.add('correct');
                        } else {
                            elem.classList.add('incorrect');
                            answerIsCorrect = false;
                        }
                    }
                }
            });

            protonation.forEach((group, groupIdx) => {
                let numEqAtomsWithLessChg = group.pKas.filter(pKa => pH > pKa).length;
                let numAtomsWithInitChg = group.atoms.length - numEqAtomsWithLessChg;
                group.atoms.forEach(groupAtomIdx => {
                    if (molecule.atoms[groupAtomIdx].chg == group.state) {
                        numAtomsWithInitChg = numAtomsWithInitChg - 1;
                    } else if (molecule.atoms[groupAtomIdx].chg == group.state - 1) {
                        numEqAtomsWithLessChg = numEqAtomsWithLessChg - 1;
                    }
                });
                const groupProtonationIsCorrect = numEqAtomsWithLessChg == 0 && numAtomsWithInitChg == 0;
                
                document.querySelectorAll(`.atom-highlight.selectable[group="${groupIdx}"]`).forEach(elem => {
                    if (elem.hasAttribute('error')) 
                        elem.toggleAttribute('error');
                    elem.classList.remove('selectable');
                    if (groupProtonationIsCorrect) {
                        elem.classList.add('correct');
                    } else {
                        elem.classList.add('incorrect');
                        answerIsCorrect = false;
                    }
                });
            });

            if (answerIsCorrect)
                    feedback.textContent = `Excellent. This is the prevalent protonation state of the molecule at pH ${pH}`;
            else {
                    feedback.textContent = `Green atoms are in their correct protonation state, while red atoms are not.`;
            }

        } else if (event.target.id == 'select-another') {
            const selected = document.querySelector('.selected');
            selected.classList.remove('selected');
            document.getElementById('initial-selection').removeAttribute('hidden');
            document.getElementById('check-answer').removeAttribute('disabled');
            document.getElementById('after-selection').setAttribute('hidden','');
            main.removeEventListener('click', handleMoleculeInteraction);
        }
    }

    main.addEventListener('click', handleMoleculeInteraction);
    document.getElementById('initial-selection').setAttribute('hidden','');
    document.getElementById('after-selection').removeAttribute('hidden');
}

const handleMolFileData = molFileRequest => {
    if (molFileRequest.readyState === XMLHttpRequest.DONE) {
        if (molFileRequest.status === 200) {
            const molFile = molFileRequest.responseText;
            const selectedMolecule = document.querySelector('.selected');
            const moleculeName = selectedMolecule.textContent;
            loadMoleculeWithRDKit({ 
                molblock: molFile, 
                protonationData: protonationData[moleculeName],
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleProtonationData = () => {
    if (protonationDataRequest.readyState === XMLHttpRequest.DONE) {
        if (protonationDataRequest.status === 200) {
            const protonationDataResponse = JSON.parse(protonationDataRequest.responseText);
            protonationDataResponse.molecules.forEach(molecule => {
                const li = document.createElement('li');
                li.className = 'molecule';
                li.setAttribute('fileName', molecule.fileName);
                li.textContent = molecule.name;
                moleculeList.append(li);
                protonationData[molecule.name] = molecule;
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

const protonationDataRequest = new XMLHttpRequest();
protonationDataRequest.onreadystatechange = handleProtonationData;
protonationDataRequest.open("GET", "protonation/protonation_data.json");
protonationDataRequest.send();
