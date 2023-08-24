const main = document.querySelector('main');

let RDKitModule;
let functionalGroupsData = {};
const loadMoleculeWithRDKit = ({ molblock, moleculeData }) => {
    const functionalGroup = chooseRandomFunctionalGroup(moleculeData);
    document.getElementById('problem-statement').textContent = `Identify all ${functionalGroup} groups in ${moleculeData.name} by highlighting
        the atoms and bonds which belong to them.`;
    document.getElementById('next-molecule').setAttribute('disabled', '');
    document.getElementById('clear-highlight').removeAttribute('disabled');
    document.getElementById('check-answer').removeAttribute('disabled');

    const feedback = document.getElementById('feedback');

    let rdkitMol = RDKitModule.get_mol(molblock);
    let mol = JSON.parse(rdkitMol.get_json());
    const moleculeDiv = document.getElementById("molecule");
    const bonds = JSON.parse(rdkitMol.get_json())['molecules'][0].bonds.map((_,i)=>i);
    const atoms = JSON.parse(rdkitMol.get_json())['molecules'][0].atoms.map((_,i)=>i);

    const mdetails = {};
    mdetails['bonds'] = bonds;
    mdetails['atoms'] = atoms;
    mdetails['legend'] = moleculeData.name;
    mdetails['highlightColour'] = [1,1,1];
    mdetails['width'] = moleculeData.width;
    mdetails['height'] = moleculeData.height;
    mdetails['highlightBondWidthMultiplier'] = 16;
    mdetails['useMolBlockWedging'] = true;
    mdetails['continuousHighlight'] = true;
    mdetails['fillHighlights'] = true;
    mdetails['highlightRadius'] = 0.3;

    moleculeDiv.innerHTML= rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));

    let bondHighlights = moleculeDiv.querySelectorAll('path');
    for (let i = 0; i < bonds.length; i++) {
        bondHighlights[i].classList.add('bond-highlight');
    }
      
    let atomHighlights = moleculeDiv.querySelectorAll('ellipse');
    for (let i = 0; i < atoms.length; i++) {
        atomHighlights[i].classList.add('atom-highlight');
    }

    const smarts = functionalGroupSmarts[functionalGroup];

    // const substructure = '[NX3][CX3](=[OX1])';//'[CX3](=O)[OX2H1]';
    const q = RDKitModule.get_qmol(smarts);
    let matches = { atoms: [], bonds: [] };
    JSON.parse(rdkitMol.get_substruct_matches(q)).forEach(match => {
        match.atoms.forEach(atom => matches.atoms.push(atom));
        match.bonds.forEach(bond => matches.bonds.push(bond));
    });
    matches.atoms = new Set(matches.atoms);
    matches.bonds = new Set(matches.bonds);   

    let selecting = false;
    let mousedowntarget = undefined;
    const handleMouseDown = event => {
        selecting = true;
        
        if (isAtomOrBond(event.target) && event.target.getAttribute('highlighted') !== '')
            event.target.toggleAttribute('highlighted');
        else {
            mousedowntarget = event.target;
        }
    };

    moleculeDiv.addEventListener('mousedown', handleMouseDown);

    const handleMouseUp = event => {
        selecting = false;
        if (isAtomOrBond(event.target) && event.target == mousedowntarget)
            event.target.toggleAttribute('highlighted');
        mousedowntarget = undefined;
    };

    moleculeDiv.addEventListener('mouseup', handleMouseUp);

    const handleMouseLeave = () => {
        selecting = false;
    };

    moleculeDiv.addEventListener('mouseleave', handleMouseLeave);

    const handleMouseOver = event => {
        if (selecting && event.target.getAttribute('highlighted') !== '' && isAtomOrBond(event.target))
            event.target.toggleAttribute('highlighted');
    };

    moleculeDiv.addEventListener('mouseover', handleMouseOver);

    const handleTouchStart = event => {
        event.preventDefault();        
        if (event.touches.length == 1 && isAtomOrBond(event.target))
            event.target.toggleAttribute('highlighted');

    };

    moleculeDiv.addEventListener('touchstart', handleTouchStart);

    const handleTouchMove = event => {
        const elem = document.elementFromPoint(event.touches[0].clientX, event.touches[0].clientY);
        if (event.touches.length == 1 && elem.getAttribute('highlighted') !== '' && isAtomOrBond(elem))
            elem.toggleAttribute('highlighted');
    };

    moleculeDiv.addEventListener('touchmove', handleTouchMove);

    const isAtomOrBond = target => target.matches('.atom-highlight, .bond-highlight');

    const getSelection = molecule => {
        const atoms = new Set([...document.querySelectorAll('svg .atom-highlight[highlighted]').values()].map(atomElem=>parseInt(atomElem.classList[0].split('-')[1])));
        const bonds = [];
        [...document.querySelectorAll('svg .bond-highlight[highlighted]').values()].forEach( bondElem => {
                const bondIdx = parseInt(bondElem.classList[0].split('-')[1]);
                (!atoms.has(molecule.bonds[bondIdx].atoms[0]) || !atoms.has(molecule.bonds[bondIdx].atoms[1])) ?
                    document.querySelector(`svg .bond-${bondIdx}.bond-highlight[highlighted]`).toggleAttribute('highlighted')
                    : bonds.push(bondIdx);
        });
        return { atoms, bonds: new Set(bonds) };
    };

    const compareSelectionWithSolution = (selection, solution) => {
        const missing = { atoms: solution.atoms, bonds: solution.bonds };
        const correct = { atoms: new Set(), bonds: new Set() };
        const incorrect = { atoms: new Set(), bonds: new Set() };
        const compare = prop => selection[prop].forEach(idx => {
            const propname = prop.slice(0, -1);
            if (solution[prop].has(idx)) {
                correct[prop].add(idx);
                document.querySelector(`svg .${propname}-${idx}.${propname}-highlight`).setAttribute('class', 'correct');
                missing[prop].delete(idx);
            } else {
                incorrect[prop].add(idx);
                document.querySelector(`svg .${propname}-${idx}.${propname}-highlight`).setAttribute('class', 'incorrect');
            }
        });
        compare('atoms');
        compare('bonds');
        missing.atoms.forEach(atomIdx => document.querySelector(`svg .atom-${atomIdx}.atom-highlight`).setAttribute('class', 'missing'));
        missing.bonds.forEach(bondIdx => document.querySelector(`svg .bond-${bondIdx}.bond-highlight`).setAttribute('class', 'missing'));
        return { correct, incorrect, missing };
    };


    const main = document.querySelector('main');

    const handleMoleculeInteraction = event => {
        
        if (event.target.id == 'clear-highlight') 
            document.querySelectorAll('[highlighted]').forEach(elem => 
                elem.toggleAttribute('highlighted'));
        
        if (event.target.id == 'check-answer') {
            event.target.setAttribute('disabled', '');
            document.getElementById('clear-highlight').setAttribute('disabled', '');
            document.getElementById('next-molecule').removeAttribute('disabled');
            const selection = getSelection(mol.molecules[0]);
            const { correct, incorrect, missing } = compareSelectionWithSolution(selection, matches);
            
            document.querySelectorAll('.atom-highlight, .bond-highlight').forEach(elem => elem.classList.add('disabled'));

            const article = functionalGroup.match(/^[aeiou]/i) == null ? "a" : "an";
            if (correct.atoms.size > 0) {
                const correctFeedback = document.createElement('li');
                correctFeedback.textContent = 
                `Green atoms belong to ${article} ${functionalGroup} group and were highlighted correctly.`;
                correctFeedback.setAttribute('class', 'correct');
                feedback.appendChild(correctFeedback);
            }
            
        
            if (missing.atoms.size > 0) {
                const missingFeedback = document.createElement('li');
                missingFeedback.textContent = 
                `Gray atoms belong to ${article} ${functionalGroup} group, but were
                not highlighted.`;
                missingFeedback.setAttribute('class', 'missing');
                feedback.appendChild(missingFeedback);
            }
        
            if (incorrect.atoms.size > 0) {
                const incorrectFeedback = document.createElement('li');
                incorrectFeedback.textContent = 
                `Red atoms do not belong to ${article} ${functionalGroup} group and 
                were highlighted incorrectly.`;
                incorrectFeedback.setAttribute('class', 'incorrect');
                feedback.appendChild(incorrectFeedback);
            }

        }
        
        if (event.target.id == 'next-molecule') {
            main.removeEventListener('click', handleMoleculeInteraction);
            moleculeDiv.removeEventListener('mousedown', handleMouseDown);
            moleculeDiv.removeEventListener('mouseup', handleMouseUp);
            moleculeDiv.removeEventListener('mouseleave', handleMouseLeave);
            moleculeDiv.removeEventListener('mouseover', handleMouseOver);
            moleculeDiv.removeEventListener('touchstart', handleTouchStart);
            moleculeDiv.removeEventListener('touchmove', handleTouchMove);
            while (feedback.firstChild) {
                feedback.removeChild(feedback.firstChild);
            } 
            loadNextMolecule(moleculeData.name);
        }
    }

    main.addEventListener('click', handleMoleculeInteraction);
        
}

const handleMolFileData = (molFileRequest, molecule) => {
    if (molFileRequest.readyState === XMLHttpRequest.DONE) {
        if (molFileRequest.status === 200) {
            const molFile = molFileRequest.responseText;
            loadMoleculeWithRDKit({ 
                molblock: molFile, 
                moleculeData: molecule,
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const functionalGroupsDataRequest = new XMLHttpRequest();
const handleFunctionalGroupsData = () => {
    if (functionalGroupsDataRequest.readyState === XMLHttpRequest.DONE) {
        if (functionalGroupsDataRequest.status === 200) {
            const functionalGroupsDataResponse = JSON.parse(functionalGroupsDataRequest.responseText);
            functionalGroupsDataResponse.molecules.forEach(molecule => {
                functionalGroupsData[molecule.name] = molecule;
            });
            loadNextMolecule();
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const loadNextMolecule = currentMolecule => {
        const molFileRequest = new XMLHttpRequest();
        const nextMolecule = chooseRandomMolecule(currentMolecule);
        molFileRequest.onreadystatechange = () => handleMolFileData(molFileRequest, nextMolecule);
        molFileRequest.open("GET", `molfiles/${nextMolecule.fileName}`);
        molFileRequest.send();
}

const chooseRandomMolecule = currentMolecule => {
    if (currentMolecule != undefined) {
        const randomIndex = getRandomInt(0, Object.keys(functionalGroupsData).length - 1);
        return Object.values(functionalGroupsData).filter(value=>value.name != currentMolecule)[randomIndex];
    }
    const randomIndex = getRandomInt(0, Object.keys(functionalGroupsData).length);
    return Object.values(functionalGroupsData)[randomIndex];
}

const chooseRandomFunctionalGroup = molecule => {
    return molecule.functionalGroups[getRandomInt(0, molecule.functionalGroups.length)];
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

initRDKitModule().then(function (instance) {
    RDKitModule = instance;

    functionalGroupsDataRequest.onreadystatechange = handleFunctionalGroupsData;
    functionalGroupsDataRequest.open("GET", "functional-groups/functional-groups_data.json");
    functionalGroupsDataRequest.send();
});
  


