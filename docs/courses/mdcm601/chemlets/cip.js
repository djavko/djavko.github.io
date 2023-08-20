const main = document.querySelector('main');
const moleculeList = document.getElementById('molecule-list');

let RDKitModule;
initRDKitModule().then(function (instance) {
    RDKitModule = instance;
});

let cipData = {};
const load3DModelWithChemDoodle = ({ molblock, cipData }) => {
    let transformBallAndStick = new ChemDoodle.TransformCanvas3D('3DModel', cipData.width, 400);
    transformBallAndStick.styles.set3DRepresentation('Ball and Stick');
    transformBallAndStick.styles.backgroundColor = 'black';
    let chemDoodleMol = ChemDoodle.readMOL(molblock, 1);
    transformBallAndStick.loadMolecule(chemDoodleMol);
}


const loadMoleculeWithRDKit = ({ molblock, cipData }) => {
    let rdkitMol = RDKitModule.get_mol(molblock);//RDKitModule.get_mol(RDKitModule.get_mol(molblock).get_new_coords(true));
    // RDKitModule.get_mol(RDKitModule.get_mol(RDKitModule.get_mol(molblock).add_hs()).get_new_coords(true));
    // console.log(rdkitMol.get_v3Kmolblock());
    let mol = JSON.parse(rdkitMol.get_json());
    const molecule = mol.molecules[0];
    const bonds = JSON.parse(rdkitMol.get_json())['molecules'][0].bonds.map((_,i)=>i);
    const atoms = JSON.parse(rdkitMol.get_json())['molecules'][0].atoms.map((_,i)=>i);

    const mdetails = {};
    mdetails['bonds'] = bonds;
    mdetails['atoms'] = atoms;
    mdetails['legend'] = cipData.name;
    // mdetails['addAtomIndices'] = true;
    // mdetails['annotationFontScale'] = 1;
    // mdetails['addBondIndices'] = true;
    // mdetails['atomLabels'] = { 0: '1', 1: 'Y'};
    // mdetails['addStereoAnnotation'] = true;
    mdetails['highlightColour'] = [1,1,1];
    mdetails['width'] = cipData.width == undefined ? 200 : cipData.width;
    // mdetails['width'] = 800;
    mdetails['height'] = cipData.height == undefined ? 200 : cipData.height;
    // mdetails['height'] = Math.floor(document.body.offsetWidth * 0.5);
    // mdetails['highlightBondWidthMultiplier'] = 16;
    mdetails['useMolBlockWedging'] = true;
    // mdetails['wedgeBonds'] = true;
    // mdetails['addChiralHs'] = true;
    const cipAtomsEntries = JSON.parse(rdkitMol.get_stereo_tags()).CIP_atoms;

    const cipAtoms = Object.fromEntries(cipAtomsEntries.map(entry=>[ entry[0], { descriptor: entry[1][1], assigned: false, correct: false }]));
    Object.keys(cipData.priorities).forEach(atomIdx=> {
        cipAtoms[parseInt(atomIdx)].priorities = cipData.priorities[atomIdx];
    });

    const moleculeDiv = document.getElementById("molecule");
    moleculeDiv.innerHTML= rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));

    let bondHighlights = moleculeDiv.querySelectorAll('path');
    for (let i = 0; i < bonds.length; i++) {
        bondHighlights[i].classList.add('bond-highlight');
    }
      
    let atomHighlights = moleculeDiv.querySelectorAll('ellipse');
    for (let i = 0; i < atoms.length; i++) {
        atomHighlights[i].classList.add('atom-highlight', 'selectable');
    }

    const main = document.querySelector('main');

    const feedback = document.getElementById('feedback');

    const getAtomIdx = target => parseInt(target.classList[0].split('-')[1]);

    const isCIPAtom = atomIdx => Object.keys(cipAtoms).includes(`${atomIdx}`);

    const isAlreadyAssigned = atomIdx => cipAtoms[atomIdx].assigned;

    const getName = atomIdx => {
        const atom = molecule.atoms[atomIdx];
        return Object.keys(atom).includes('z') ? elements[atom.z] : elements[mol.defaults.atom.z];
    }

    const getAdjacentBonds = atomIdx => molecule.bonds.map((bond, bondIdx) => bond.atoms[0] == atomIdx ? { bondIdx, otherAtomIdx: bond.atoms[1]} : 
        (bond.atoms[1] == atomIdx ? { bondIdx, otherAtomIdx: bond.atoms[0] } : null)).filter(x => x!==null);

    const getBondOrder = bondIdx => {
        const bond = molecule.bonds[bondIdx];
        return Object.keys(bond).includes('bo') ? bond.bo : mol.defaults.bond.bo;
    }

    const getZ = atomIdx => {
        const atom = molecule.atoms[atomIdx];
        return Object.keys(atom).includes('z') ? atom.z : mol.defaults.atom.z;
    }

    feedback.textContent = 'First, identify any of the unassigned stereocenters in the molecule and click on it.'

    let sortedTerminalAtoms = {1:[],2:[],3:[],4:[]}; //branchIdx: [[priority-1], [priority-2],...]

    let selectedTerminalAtoms = []; //[[priority-1], [priority-2],...]

    let correctAssignment = {1:'T',2:'T',3:'T',4:'T'}; //branchIdx: [[priority-1], [priority-2],...]

    let priorities = ['1', '2', '3', '4'];

    let sphere = 1;

    let withHelper = false;

    const comparePriorities = (terminalAtomData, refData) => {
        if (terminalAtomData[0] == refData[0]) {
            if (!terminalAtomData[1] && !refData[1])
                return 0;
            else {
                if (terminalAtomData[1] && refData[1]) {
                    if (terminalAtomData[2] == refData[2]) return 0;
                    return parseInt(terminalAtomData[2]) < parseInt(refData[2]) ? 1 : -1;
                } else {
                    return refData[1] ? 1 : -1;
                }
            }
        } else {
            return terminalAtomData[0] > refData[0] ? 1 : -1;
        }
    }

    const addToSortedAtomList = (atomList, newTerminalAtomData) => {
        if (atomList.length == 0) {
            atomList[0] = [newTerminalAtomData];
        } else {
            let i = 0;
            let comparison;
            while (i < atomList.length && (comparison = comparePriorities(newTerminalAtomData.slice(1), atomList[i][0].slice(1))) < 0) {
                i++;
            }
            if (comparison == 0)
            atomList[i].push(newTerminalAtomData);
            else {
                atomList.splice(i, 0, [newTerminalAtomData]);
            }
        }
    }

    const assignPrioritiesToSelected = () => {
        let alreadyTied = false;
        let unassignedPriorityValues = ['1','2','3','4'].filter(value=>!Object.values(correctAssignment).includes(value));
        selectedTerminalAtoms.forEach(priorityGroup => {
            if (priorityGroup.length > 1) {
                priorityGroup.forEach(selectedAtomData => {
                    const branchIdx = selectedAtomData[0][0];
                    correctAssignment[branchIdx] = alreadyTied ? 't': 'T';
                    unassignedPriorityValues.splice(0,1);
                });
                alreadyTied = true;
            } else {
                const branchIdx = priorityGroup[0][0][0];
                correctAssignment[branchIdx] = unassignedPriorityValues[0];
                unassignedPriorityValues.splice(0,1);
            }
        });
        selectedTerminalAtoms = [];
    }

    const refreshSVG = mdetails => {
        moleculeDiv.innerHTML = rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));

        let bondHighlights = moleculeDiv.querySelectorAll('path');
        for (let i = 0; i < bonds.length; i++) {
            bondHighlights[i].classList.add('bond-highlight');
        }
        
        let atomHighlights = moleculeDiv.querySelectorAll('ellipse');
        for (let i = 0; i < atoms.length; i++) {
            atomHighlights[i].classList.add('atom-highlight', 'selectable');
        }
    }

    const stereocenterAssignmentForm = document.getElementById('assign-stereocenter');
    
    const handleStereocenterAssignment = event => {
        event.preventDefault();
        stereocenterAssignmentForm.setAttribute('hidden','');
        const stereocenter = document.querySelector('[stereocenter]');
        const atomIdx = getAtomIdx(stereocenter);
 
        const atomName = getName(atomIdx);
        const correctDescriptor = cipAtoms[atomIdx].descriptor;
        const answer = new FormData(stereocenterAssignmentForm);
        cipAtoms[atomIdx].assigned = true;
        const numUnassignedStereocenters = Object.values(cipAtoms).filter(entry => !entry.assigned).length;
        if (correctDescriptor == answer.get('descriptor')) {
            feedback.textContent = `Excellent. This ${atomName} stereocenter is ${correctDescriptor}. `;
            cipAtoms[atomIdx].correct = true;
        } else {
            feedback.textContent = `This ${atomName} stereocenter is actually ${correctDescriptor}. Note that if you rotate the molecule so that the substituent with
            priority 4 is pointing away from you, the atoms with priorities 1, 2 and 3 are arranged in a 
            ${correctDescriptor == 'R' ? 'clockwise' : 'counterclockwise'} direction around the stereocenter. `;
        }
        if (numUnassignedStereocenters > 0) {
            feedback.textContent += 'Identify another unassigned stereocenter in the molecule and click on it.';
            refreshSVG(mdetails);
        } else {
            feedback.textContent += `All of the stereocenters in this molecule have been assigned a descriptor. Those that were assigned correctly are highlighted in green, while
            those that were incorrect are shown in red. The correct descriptor for each stereocenter is now being displayed next to it.`;
            refreshSVG({...mdetails, addStereoAnnotation: true });
            Object.keys(cipAtoms).forEach(atomIdx => {
                document.querySelector(`.atom-highlight.atom-${atomIdx}`).classList.add(cipAtoms[atomIdx].correct ? 'correct-descriptor' : 'incorrect-descriptor');
            });
            document.querySelectorAll('.selectable').forEach(elem=>elem.classList.remove('selectable'));
        }
        
    }
    stereocenterAssignmentForm.addEventListener('submit', handleStereocenterAssignment, false);

    document.getElementById('initial-selection').setAttribute('hidden','');
    document.getElementById('after-selection').removeAttribute('hidden');

    const handleMoleculeInteraction = event => {

        // Assign the currently set priority values.
        if (event.target.id == 'assign-priorities') {

            let correctlyAssigned = [];
            // Check assignment correctness.
            let assignmentIsCorrect = true;
            document.querySelectorAll(`text[branchIdx]`).forEach(elem => {
                const branchIdx = parseInt(elem.getAttribute('branchIdx'));
                const assignedPriority = elem.textContent;
                if (assignedPriority != correctAssignment[branchIdx]) {
                    document.querySelector(`circle[branchIdx="${branchIdx}"]`).classList.remove('correct');
                    document.querySelector(`circle[branchIdx="${branchIdx}"]`).classList.add('incorrect');
                    assignmentIsCorrect = false;
                } else {
                    correctlyAssigned.push(branchIdx);
                    document.querySelector(`circle[branchIdx="${branchIdx}"]`).classList.add('correct');
                    document.querySelector(`circle[branchIdx="${branchIdx}"]`).classList.remove('incorrect');
                    document.querySelector(`[branchIdx="${branchIdx}"][priority]`).classList.remove('rankable');
                }
            });

            if (withHelper) {
                // Deactivate active branch.
                document.querySelectorAll(`.active-branch`).forEach(branchElem => {
                    branchElem.classList.remove('active-branch');
                });
            }

            // Move to next iteration, next sphere or descriptor assignment.
            if (assignmentIsCorrect) {
                feedback.textContent = `Excellent. The assigned priorities are correct. `;
                let assignedValues = [];
                let tiedBranches = Object.keys(correctAssignment).filter(key => correctAssignment[key] == 'T');
                if (tiedBranches.length == 0) {
                    tiedBranches = Object.keys(correctAssignment).filter(key => correctAssignment[key] == 't');
                    tiedBranches.forEach(branchIdx => correctAssignment[branchIdx] = 'T');
                }
                const assignmentIsFinished = tiedBranches.length == 0;
                const movingToNextSphere = !assignmentIsFinished && tiedBranches.every(branchIdx => sortedTerminalAtoms[branchIdx].length == 0);

                if (movingToNextSphere) {
                    sphere++;
                }
            
                document.getElementById('assign-priorities').setAttribute('disabled','');
                if (!withHelper) document.getElementById('help-assign-priorities').removeAttribute('disabled');
                if (!assignmentIsFinished) {
                    feedback.textContent += `But note that there is still a tie between substituents (in orange) that needs to be resolved. Click on one of them to select an atom from that substituent.`;
                    // console.log('assignment not finished');
                    // Iterate over each branch.
                    Object.entries(correctAssignment).forEach(entry => {
                        const branchIdx = entry[0];
                        const assignment = entry[1];

                        if (assignment != 'T') assignedValues.push(assignment);

                        const initialBond = document.querySelector(`.initial-bond.branch-${branchIdx}`);
                        initialBond.setAttribute('priority', correctAssignment[branchIdx]);
                        if (assignment == 'T') {
                            initialBond.classList.add('selectable');
                            if (movingToNextSphere) sortedTerminalAtoms[branchIdx] = [];
                        }
                        const newTerminalAtoms = [];

                        // Iterate over terminal atoms in branch.
                        const terminalAtoms = [];
                        document.querySelectorAll(`.terminal-atom-${branchIdx}`).forEach(terminalAtom => {
                            const atomIdx = getAtomIdx(terminalAtom);
                            terminalAtoms.push({
                                atomIdx,
                                adjacentBonds: getAdjacentBonds(atomIdx),
                                fromBond: parseInt(terminalAtom.getAttribute(`from-bond-${branchIdx}`)),
                                dist: parseInt(terminalAtom.getAttribute(`dist-${branchIdx}`)),
                            });

                            if (assignment == 'T') {
                                if (movingToNextSphere) {
                                    terminalAtom.classList.remove(`used-${branchIdx}`);
                                    if (!newTerminalAtoms.includes(atomIdx)) {
                                        terminalAtom.classList.remove(`terminal-atom-${branchIdx}`);
                                        terminalAtom.removeAttribute(`from-bond-${branchIdx}`);
                                        terminalAtom.removeAttribute(`multiplicity-${branchIdx}`);
                                    }
                                } else {
                                    // console.log('moving to next iteration');
                                    // MOVING TO NEXT SELECTION OF TERMINAL ATOMS
                                    if (parseInt(terminalAtom.getAttribute(`multiplicity-${branchIdx}`)) == 0)
                                            terminalAtom.classList.add(`used-${branchIdx}`);

                                }
                            } else if (assignment != 't') {
                                terminalAtom.classList.remove(`terminal-atom-${branchIdx}`);
                                terminalAtom.classList.remove(`used-${branchIdx}`);
                                terminalAtom.removeAttribute(`from-bond-${branchIdx}`);
                                terminalAtom.removeAttribute(`multiplicity-${branchIdx}`);
                            }
                            if (terminalAtom.classList.contains(`selected-${branchIdx}`))
                                terminalAtom.classList.remove(`selected-${branchIdx}`);
                        });

                        terminalAtoms.forEach(terminalAtom => {
                            const atomIdx = terminalAtom.atomIdx;
                            const adjacentBonds = terminalAtom.adjacentBonds;
                            const fromBond = terminalAtom.fromBond;
                            if (assignment == 'T') {
                                if (movingToNextSphere) {
                                    // console.log('moving to next sphere');
                                    // console.log(`terminal atom is ${atomIdx}`);
                                    
                                    // MOVING TO NEXT SPHERE
                                    adjacentBonds.forEach(adjacentBond => {
                                        // console.log(`adjacent bond is ${adjacentBond.bondIdx}`);
                                        if (adjacentBond.bondIdx != fromBond) {
                                            // console.log(`which is not the same as ${fromBond}`);
                                            document.querySelector(`.bond-${adjacentBond.bondIdx}.bond-highlight:not(.initial-bond)`).classList.add(`branch-${branchIdx}`);
                                            // console.log(`adding bond ${adjacentBond.bondIdx} to branch ${branchIdx}`);
                                            const newTerminalAtom = document.querySelector(`.atom-${adjacentBond.otherAtomIdx}.atom-highlight`);
                                            // console.log(`adding ${adjacentBond.otherAtomIdx} as a terminal atom`);
                                            newTerminalAtom.classList.add(`branch-${branchIdx}`);
                                            newTerminalAtom.classList.add(`terminal-atom-${branchIdx}`);
                                            if (newTerminalAtom.hasAttribute(`dist-${branchIdx}`)) {
                                                newTerminalAtom.classList.add(`duplicate-${branchIdx}`);
                                                // console.log(`${adjacentBond.otherAtomIdx} has been seen twice in branch ${branchIdx}`);
                                            } else {
                                                newTerminalAtom.setAttribute(`dist-${branchIdx}`, `${terminalAtom.dist + 1}`);
                                            }
                                            newTerminalAtom.setAttribute(`from-bond-${branchIdx}`,`${adjacentBond.bondIdx}`);
                                            newTerminalAtom.setAttribute(`multiplicity-${branchIdx}`, `${getBondOrder(adjacentBond.bondIdx)}`);
                                            const dist = newTerminalAtom.getAttribute(`dist-${branchIdx}`);
                                            const duplicate = newTerminalAtom.classList.contains(`duplicate-${branchIdx}`);
                                            const newTerminalAtomIdx = getAtomIdx(newTerminalAtom);
                                            newTerminalAtoms.push(newTerminalAtomIdx);
                                            const z = getZ(newTerminalAtomIdx);
                                            addToSortedAtomList(sortedTerminalAtoms[branchIdx], [newTerminalAtomIdx, z, duplicate, dist]);
                                        }
                                    });
                                   
                                } 
                                
                            } 
                        });

                        if (movingToNextSphere && assignment == 'T') sortedTerminalAtoms[branchIdx] = sortedTerminalAtoms[branchIdx].map(priorityGroup=>priorityGroup.map(terminalAtomData=>terminalAtomData[0]));                        

                    });
                    
                    // Hide priority assignment.
                    document.querySelectorAll('.cip-priority, .cip-circle').forEach(elem => {
                        if (elem.tagName == 'circle') {
                            elem.classList.remove('correct');
                            elem.classList.remove('incorrect');
                        }
                        elem.style.setProperty('visibility', 'hidden');
                    });
                    // Remove used priority values.
                    priorities = priorities.filter(priority => !assignedValues.includes(priority));
                } else {
                    // ASSIGMENT IS FINISHED
                    if (withHelper) {
                        [1,2,3,4].forEach(branchIdx => {
                            const selectedAtom = document.querySelector(`.selected-${branchIdx}`);
                            if (selectedAtom) selectedAtom.classList.remove(`selected-${branchIdx}`);
                        });
                        document.getElementById('model-container').style.setProperty('display','flex');;
                    }
                    document.getElementById('assign-stereocenter').removeAttribute('hidden');
                    document.getElementById('help-assign-priorities').setAttribute('disabled','');
                    feedback.textContent = `A priority has been assigned to each substituent. Click and drag to rotate the 3D model of the molecule
                    until the substituent with the lowest priority (4) is pointing away from you. Then, determine whether the substituents with priorities 
                    1, 2 and 3 are arranged in a clockwise or counterclockwise direction around the stereocenter. Based on this direction, determine whether the 
                    stereocenter is R or S.`;
                }
            } else {
                feedback.textContent = `Check the assigned priority values. The priority values circled in red are incorrect. Click on them to change their values.
                Click on the "Verify priorities" button when you're done fixing the values. `;
                if (!withHelper) feedback.textContent += `If you need help assigning priorities, click on "Help me assign priorities".`;
            }
            
        }

        // Setting priority values of undecided (rankable) branches.
        if (event.target.classList.contains('rankable')) {
            const branchIdx = event.target.getAttribute('branchIdx');
            const newPriority = priorities[(priorities.indexOf(event.target.getAttribute('priority')) + 1) % priorities.length];
            event.target.setAttribute('priority', newPriority);
            document.querySelector(`text[branchIdx="${event.target.getAttribute('branchIdx')}"]`).textContent = newPriority;
            if (withHelper) {
                document.querySelectorAll(`[class*=branch]`).forEach(branchElem => {
                    if (branchElem.classList.contains(`branch-${branchIdx}`)) {
                        branchElem.classList.add('active-branch');
                    } else {
                        branchElem.classList.remove('active-branch');
                    }                    
                });
            }
        }

        // If a branch is clicked on, it is activated.
        if (event.target.classList.contains('initial-bond') && !event.target.classList.contains('rankable')) {
            const branchIdx = event.target.getAttribute('branchIdx');
            // Ran out of terminal atoms
            if (sortedTerminalAtoms[branchIdx].length == 0) {
                document.querySelectorAll(`.active-branch`).forEach(branchElem => {
                    branchElem.removeAttribute('active-branch');
                    branchElem.classList.remove('selectable');
                    branchElem.classList.remove('active-branch');                   
                });
                document.querySelector(`.initial-bond.branch-${branchIdx}`).classList.remove('selectable');
                addToSortedAtomList(selectedTerminalAtoms, [[branchIdx], 0, false, 0]);
                feedback.textContent = `
                There are no more atoms which are ${sphere} bond(s) away from the
                stereocenter in this substituent. `;
                const finishedSelection = document.querySelector('.initial-bond.selectable') === null;
                if (finishedSelection) {
                    // document.getElementById('assign-priorities').style.setProperty('visibility', 'visible');
                    assignPrioritiesToSelected();
                    const undecidedBranches = document.querySelectorAll(`.initial-bond[priority="T"]`);
                    undecidedBranches.forEach(elem=>elem.classList.add('rankable'));

                    document.querySelectorAll('.cip-priority, .cip-circle').forEach(elem => {
                        elem.style.setProperty('visibility', 'visible');
                    });
                    feedback.textContent += `Click on the circles that now appeared to rank the selected atoms according to their priority.
                    Substituents with a selected atom have a higher priority than those without one. 
                    Once finished, click on the "Verify priorities" button.`;
                    document.getElementById('assign-priorities').removeAttribute('disabled');
                } else {
                    feedback.textContent += `Click on one of the remaining bonds (in orange) to select an atom 
                    from that substituent.`;
                }
            } else {
                // Set branch as active and deactivate the previously active branch, if any.
                document.querySelectorAll(`[class*=branch]`).forEach(branchElem => {
                    if (branchElem.classList.contains(`branch-${branchIdx}`)) {
                        if (branchElem.classList.contains(`terminal-atom-${branchIdx}`) && !branchElem.classList.contains(`used-${branchIdx}`)) {
                            branchElem.classList.add('selectable');
                            branchElem.setAttribute('active-branch', `${branchIdx}`)
                        }
                        branchElem.classList.add('active-branch');
                    } else {
                        if (branchElem.matches('.selectable[active-branch]')) {
                            branchElem.classList.remove('selectable');
                            branchElem.removeAttribute('active-branch');
                        }
                        branchElem.classList.remove('active-branch');
                    }                    
                });
                feedback.textContent = `
                Good. The atoms in this substituent which are ${sphere} bond(s) away from the
                stereocenter have been circled. Click on the circled atom with the highest priority.
                If there are two or more that share the highest priority, click on any
                one of them. If there is only one circled atom, then making this choice is easy.`;
            }
        }

        // Chose a terminal atom as the highest priority one in the branch
        if (event.target.matches('.selectable[active-branch]')) {
            const branchIdx = parseInt(event.target.getAttribute('active-branch'));
            const atomIdx = getAtomIdx(event.target);
            const atomName = getName(atomIdx);
            const idxInSorted = sortedTerminalAtoms[branchIdx][0].indexOf(atomIdx);
            const highestPriority = idxInSorted != -1;
            // Chose correctly
            if (highestPriority) {
                let updatedMultiplicity = parseInt(event.target.getAttribute(`multiplicity-${branchIdx}`)) - 1;
                event.target.setAttribute(`multiplicity-${branchIdx}`,  `${updatedMultiplicity}`);
                if (updatedMultiplicity == 0) sortedTerminalAtoms[branchIdx][0].splice(idxInSorted,1);
                if (sortedTerminalAtoms[branchIdx][0].length == 0) sortedTerminalAtoms[branchIdx].splice(0,1);
                // Mark as selected
                event.target.classList.add(`selected-${branchIdx}`);
                // Deactivate active branch
                document.querySelectorAll(`.active-branch`).forEach(branchElem => {
                    branchElem.removeAttribute('active-branch');
                    branchElem.classList.remove('selectable');
                    branchElem.classList.remove('active-branch');                   
                });

                const dist = event.target.getAttribute(`dist-${branchIdx}`);
                const duplicate = event.target.classList.contains(`duplicate-${branchIdx}`);
                const z = getZ(atomIdx);
                addToSortedAtomList(selectedTerminalAtoms, [[branchIdx, atomIdx], z, duplicate, dist]);
                feedback.textContent = `
                Well done. There were no circled atoms in this substituent that had a higher priority than this ${atomName} atom. `;
                const finishedSelection = document.querySelector('.initial-bond.selectable') === null;
                if (finishedSelection) {
                    document.getElementById('assign-priorities').removeAttribute('disabled');
                    assignPrioritiesToSelected();
                    const undecidedBranches = document.querySelectorAll(`.initial-bond[priority="T"]`);
                    undecidedBranches.forEach(elem=>elem.classList.add('rankable'));

                    document.querySelectorAll('.cip-priority, .cip-circle').forEach(elem => {
                        elem.style.setProperty('visibility', 'visible');
                    });
                    feedback.textContent += `You have selected an atom (in blue) from each substituent. Click on the circles that now appeared to rank the selected atoms according to their priority.
                    Follow the convention that highest priority is 1, and lowest is 4. If two atoms have the same priority, label the two with a "T" for "tie". Only use lowercase "t" in the 
                    case where two ties occur to indicate the pair of tied atoms with the lower priority (i.e. uppercase is higher priority than lowercase). 
                    Once finished, click on the "Verify priorities" button.`;

                } else {
                    feedback.textContent += `Click on one of the remaining bonds (in orange) to select an atom 
                    from that substituent.`;
                }

            // Chose incorrectly
            } else {
                feedback.textContent = `
                Take a closer look. There is another circled atom which has a higher priority than this ${atomName} atom.`;
            }
            // console.log(sortedTerminalAtoms);

        }

        if (event.target.id == 'help-assign-priorities') {
            event.target.setAttribute('disabled','');
            document.getElementById('assign-priorities').setAttribute('disabled','');

            withHelper = true;
            sortedTerminalAtoms = {1:[],2:[],3:[],4:[]}; //branchIdx: [[priority-1], [priority-2],...]
            selectedTerminalAtoms = []; //[[priority-1], [priority-2],...]
            correctAssignment = {1:'T',2:'T',3:'T',4:'T'}; //branchIdx: [[priority-1], [priority-2],...]
            priorities = ['T', '1', '2', '3', '4', 't'];
            sphere = 1;

            const svg = moleculeDiv.querySelector('svg');
            const stereocenter = document.querySelector('[stereocenter]');
            const atomIdx = getAtomIdx(stereocenter);
            const atomName = getName(atomIdx);
            stereocenter.setAttribute('dist-1', '0');
            stereocenter.setAttribute('dist-2', '0');
            stereocenter.setAttribute('dist-3', '0');
            stereocenter.setAttribute('dist-4', '0');
            const firstPath = svg.querySelector('path');
            const adjacentBonds = getAdjacentBonds(atomIdx);
            adjacentBonds.forEach(adjacentBond => {
                const initialBond = document.querySelector(`.bond-${adjacentBond.bondIdx}.bond-highlight`);
                const branchIdx = initialBond.getAttribute('branchIdx');
                initialBond.removeAttribute('branchIdx');
                initialBond.classList.remove(`rankable`);
                initialBond.removeAttribute('priority');
                // Clone the initial bond to place at the beginning of the SVG children nodes.
                const clone = initialBond.cloneNode();
                clone.classList.add(`initial-bond`, 'selectable');
                clone.setAttribute('branchIdx', `${branchIdx}`);
                clone.setAttribute('priority', 'T');
                initialBond.classList.add(`substituent-${branchIdx}`);
                svg.insertBefore(clone, firstPath);

                // Label each atom on the other side of the bond as this iteration's terminal atom.
                const terminalAtom = document.querySelector(`.atom-${adjacentBond.otherAtomIdx}.atom-highlight`);
                terminalAtom.classList.add(`branch-${branchIdx}`);//,`terminal-atom`);
                terminalAtom.classList.add(`terminal-atom-${branchIdx}`);
                terminalAtom.setAttribute(`dist-${branchIdx}`, '1');
                terminalAtom.setAttribute(`from-bond-${branchIdx}`,`${adjacentBond.bondIdx}`);
                terminalAtom.setAttribute(`multiplicity-${branchIdx}`,'1');
 
                sortedTerminalAtoms[branchIdx] = [[adjacentBond.otherAtomIdx]];                
            });
            document.getElementById('model-container').style.setProperty('display','none');
            document.querySelectorAll('.cip-priority, .cip-circle').forEach(elem => {
                if (elem.classList.contains('cip-priority'))
                    elem.textContent = 'T';
                else {
                    elem.classList.remove('correct');
                    elem.classList.remove('incorrect');
                }
                elem.style.setProperty('visibility', 'hidden');
            });
            feedback.textContent = `
                Consider the 4 bonds (in orange) which are immediately connected to this ${atomName} atom.
                Each bond attaches a different substituent to the ${atomName} stereocenter (in green). Click on any one of these 4 bonds.`;
        }

        // At the beginning, all atoms are selectable.
        if (event.target.classList.contains('selectable') && !event.target.classList.contains('initial-bond') && !event.target.classList.contains('active-branch')) {
            // console.log(event.target);
            const atomIdx = getAtomIdx(event.target);
            const atomName = getName(atomIdx);
            // If the atom is a stereocenter
            if (isCIPAtom(atomIdx)) {
                if (isAlreadyAssigned(atomIdx)) {
                    event.target.setAttribute('error','');
                    feedback.textContent = `This ${atomName} stereocenter has already been assigned. Find another stereocenter in this molecule.`;
                } else {
                    sortedTerminalAtoms = {1:[],2:[],3:[],4:[]}; //branchIdx: [[priority-1], [priority-2],...]
                    selectedTerminalAtoms = []; //[[priority-1], [priority-2],...]
                    correctAssignment = {1:'T',2:'T',3:'T',4:'T'}; //branchIdx: [[priority-1], [priority-2],...]
                    priorities = ['1', '2', '3', '4'];
                    sphere = 1;
                    withHelper = false;
                    const svg = moleculeDiv.querySelector('svg');
                    document.getElementById('help-assign-priorities').removeAttribute('disabled');
                    document.getElementById('assign-priorities').removeAttribute('disabled');
                    event.target.toggleAttribute('stereocenter');
                    // event.target.setAttributeNS('http://www.w3.org/2000/svg','stereocenter','');

                    // Clear errors
                    document.querySelectorAll('.atom-highlight').forEach(elem => {
                        if (elem.hasAttribute('error')) elem.removeAttribute('error');
                        elem.classList.remove('selectable');
                    });
                    
                    // Label each bond adjacent to the stereocenter as a selectable initial bond with a given branch ID.
                    const adjacentBonds = getAdjacentBonds(atomIdx);
                    adjacentBonds.forEach((adjacentBond, idx) => {
                        const initialBond = document.querySelector(`.bond-${adjacentBond.bondIdx}.bond-highlight`);
                        initialBond.classList.add(`branch-${idx+1}`, 'rankable');

                        initialBond.setAttribute('branchIdx', `${idx+1}`);
                        initialBond.setAttribute('priority', '1');
                        correctAssignment[idx+1] = `${cipAtoms[atomIdx].priorities.indexOf(adjacentBond.bondIdx)+1}`;

                        // Label each atom on the other side of the bond as this iteration's terminal atom.
                        const terminalAtom = document.querySelector(`.atom-${adjacentBond.otherAtomIdx}.atom-highlight`);

                        // Create hidden priority labels for each branch and append to SVG children.
                        const ax = event.target.cx.baseVal.value;
                        const ay = event.target.cy.baseVal.value;
                        const bx = terminalAtom.cx.baseVal.value;
                        const by = terminalAtom.cy.baseVal.value;

                        const priorityText = document.createElementNS('http://www.w3.org/2000/svg','text');
                        const circ = document.createElementNS('http://www.w3.org/2000/svg','circle');
                        circ.setAttribute('cx', ((ax+bx)/2).toFixed(1));
                        circ.setAttribute('cy', ((ay+by)/2).toFixed(1));
                        circ.setAttribute('class', 'cip-circle');
                        circ.setAttribute('r', 12);
                        priorityText.setAttribute('x', ((ax+bx)/2).toFixed(1));
                        priorityText.setAttribute('y', ((ay+by)/2+6).toFixed(1));
                        priorityText.textContent = '1';

                        priorityText.setAttribute('class', 'cip-priority');
                        priorityText.setAttribute('branchIdx', `${idx+1}`);
                        circ.setAttribute('branchIdx', `${idx+1}`);
                        svg.appendChild(circ);
                        svg.appendChild(priorityText);
                    });
                    
                    feedback.textContent = `
                    Good. Click on the circles that now appeared to rank the substituents of this ${atomName} stereocenter (in green) according to their priority from 
                    highest (1) to lowest (4). Once finished, click on "Verify priorities". 
                    If you need help assigning priorities, click on "Help me assign priorities".`;
                }
            } else {
                document.querySelectorAll('.atom-highlight').forEach(elem => {
                    if (elem.hasAttribute('error')) elem.removeAttribute('error');
                });
                event.target.toggleAttribute('error');
                feedback.textContent = `This ${atomName} atom is not a stereocenter since it is not bonded to 4 different substituents.`;
            }
        } else if (event.target.id == 'select-another') {
            const selected = document.querySelector('.selected');
            selected.classList.remove('selected');
            document.getElementById('initial-selection').removeAttribute('hidden');
            document.getElementById('after-selection').setAttribute('hidden','');
            main.removeEventListener('click', handleMoleculeInteraction);
            stereocenterAssignmentForm.removeEventListener('submit', handleStereocenterAssignment);
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
            // load3DModelWithChemDoodle(molFile);
            loadMoleculeWithRDKit({ 
                molblock: molFile, 
                cipData: cipData[moleculeName],
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleOptimizedMolFileData = optimizedMolFileRequest => {
    if (optimizedMolFileRequest.readyState === XMLHttpRequest.DONE) {
        if (optimizedMolFileRequest.status === 200) {
            const molFile = optimizedMolFileRequest.responseText;
            const selectedMolecule = document.querySelector('.selected');
            const moleculeName = selectedMolecule.textContent;
            load3DModelWithChemDoodle({ 
                molblock: molFile, 
                cipData: cipData[moleculeName],
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleCipData = () => {
    if (cipDataRequest.readyState === XMLHttpRequest.DONE) {
        if (cipDataRequest.status === 200) {
            const cipDataResponse = JSON.parse(cipDataRequest.responseText);
            cipDataResponse.molecules.forEach(molecule => {
                const li = document.createElement('li');
                li.className = 'molecule';
                li.setAttribute('fileName', molecule.fileName);
                li.textContent = molecule.name;
                moleculeList.append(li);
                cipData[molecule.name] = molecule;
            });
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

const handleSelectMolecule = event => {
    if (event.target.classList.contains('molecule')) {
        const molFileRequest = new XMLHttpRequest();
        const optimizedMolFileRequest = new XMLHttpRequest();
        molFileRequest.onreadystatechange = () => handleMolFileData(molFileRequest);
        optimizedMolFileRequest.onreadystatechange = () => handleOptimizedMolFileData(optimizedMolFileRequest)
        event.target.classList.add('selected');
        const fileName = event.target.getAttribute('fileName');
        molFileRequest.open("GET", `molfiles/${fileName}`);
        molFileRequest.send();
        optimizedMolFileRequest.open("GET", `optimized/${fileName}`);
        optimizedMolFileRequest.send();
    }
}

main.addEventListener('click', handleSelectMolecule);

const cipDataRequest = new XMLHttpRequest();
cipDataRequest.onreadystatechange = handleCipData;
cipDataRequest.open("GET", "cip/cip_data.json");
cipDataRequest.send();