const main = document.querySelector('main');

let RDKitModule;
initRDKitModule().then(function (instance) {
    RDKitModule = instance;
});

  // changes the default JMol color of hydrogen to black so it appears on white backgrounds
ChemDoodle.ELEMENT['H'].jmolColor = 'black';
// darkens the default JMol color of sulfur so it appears on white backgrounds
ChemDoodle.ELEMENT['S'].jmolColor = '#B9A130';
// initializes the SketcherCanvas
let sketcher = new ChemDoodle.SketcherCanvas('sketcher', 600, 350, { useServices:false, oneMolecule: true });
// sets terminal carbon labels to display
sketcher.styles.atoms_displayTerminalCarbonLabels_2D = true;
// sets atom labels to be colored by JMol colors, which are easy to recognize
sketcher.styles.atoms_useJMOLColors = true;
// enables overlap clear widths, so that some depth is introduced to overlapping bonds
sketcher.styles.bonds_clearOverlaps_2D = true;
// sets the shape color to improve contrast when drawing figures
sketcher.styles.shapes_color = 'c10000';
// because we do not load any content, we need to repaint the sketcher, otherwise we would just see an empty area with the toolbar
// however, you can instead use one of the Canvas.load... functions to pre-populate the canvas with content, then you don't need to call repaint
sketcher.repaint();

let interpreter = new ChemDoodle.io.MOLInterpreter();
interpreter.version = 3;


const writeMolFileFromSketcher = () => {
    let rdkitMol = RDKitModule.get_mol(RDKitModule.get_mol(interpreter.write(sketcher.getMolecule())).get_new_coords(true));
    document.getElementById('mol-file-textarea').value = rdkitMol.get_v3Kmolblock();
}

const loadMoleculeWithRDKit = molblock => {
    let rdkitMol = RDKitModule.get_mol(molblock);

    let mol = JSON.parse(rdkitMol.get_json());
    const molecule = mol.molecules[0];
    const bonds = JSON.parse(rdkitMol.get_json())['molecules'][0].bonds.map((_,i)=>i);
    const atoms = JSON.parse(rdkitMol.get_json())['molecules'][0].atoms.map((_,i)=>i);

    const mdetails = {};
    mdetails['bonds'] = bonds;
    mdetails['atoms'] = atoms;
    // mdetails['legend'] = cipData.name;
    // mdetails['addAtomIndices'] = true;
    // mdetails['annotationFontScale'] = 1;
    // mdetails['addBondIndices'] = true;
    // mdetails['atomLabels'] = { 0: '1', 1: 'Y'};
    // mdetails['addStereoAnnotation'] = true;
    mdetails['highlightColour'] = [1,1,1];
    // mdetails['width'] = cipData.width == undefined ? 200 : cipData.width;
    mdetails['width'] = parseInt(document.getElementById('set-width').value);
    mdetails['height'] = parseInt(document.getElementById('set-height').value);
    // mdetails['height'] = cipData.height == undefined ? 200 : cipData.height;
    // mdetails['height'] = Math.floor(document.body.offsetWidth * 0.5);
    // mdetails['highlightBondWidthMultiplier'] = 16;
    mdetails['useMolBlockWedging'] = true;
    // mdetails['wedgeBonds'] = true;
    // mdetails['addChiralHs'] = true;
    const cipAtomsEntries = JSON.parse(rdkitMol.get_stereo_tags()).CIP_atoms;

    const cipAtoms = Object.fromEntries(cipAtomsEntries.map(entry=>[ entry[0], [] ]));
    const cipData = { 
        "name": "",
        "fileName": document.getElementById('filename').value,
        "priorities": cipAtoms,
        "height": mdetails['height'],
        "width": mdetails['width']
    };
    document.getElementById('cip-data').value = JSON.stringify(cipData,null, "    ");

    const moleculeDiv = document.getElementById('molecule');
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

    const getName = atomIdx => {
        const atom = molecule.atoms[atomIdx];
        return Object.keys(atom).includes('z') ? elements[atom.z] : elements[mol.defaults.atom.z];
    }

    const getAdjacentBonds = atomIdx => molecule.bonds.map((bond, bondIdx) => bond.atoms[0] == atomIdx ? { bondIdx, otherAtomIdx: bond.atoms[1]} : 
        (bond.atoms[1] == atomIdx ? { bondIdx, otherAtomIdx: bond.atoms[0] } : null)).filter(x => x!==null);

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
    const updateCipDataText = () => {
        document.getElementById('cip-data').value = 
            JSON.stringify(cipData, null, "    ").replace(/\[(\s+)(\d+),(\s+)(\d+),(\s+)(\d+),(\s+)(\d+)(\s+)\]/g, "[$2,$4,$6,$8]");
    }

    const handleMoleculeInteraction = event => {
        if (event.target.id == 'set-width') {
            mdetails['width'] = parseInt(event.target.value);
            cipData.width = mdetails['width'];
            updateCipDataText();
            refreshSVG(mdetails);
        }
        if (event.target.id == 'set-height') {
            mdetails['height'] = parseInt(event.target.value);
            cipData.height = mdetails['height'];
            updateCipDataText();
            refreshSVG(mdetails);
        }

        if (event.target.id == 'assign-priorities') {
            const stereocenter = document.querySelector('[stereocenter]');
            const atomIdx = getAtomIdx(stereocenter);
            document.querySelectorAll(`text[branchIdx]`).forEach(elem => {
                const branchIdx = parseInt(elem.getAttribute('branchIdx'));
                const bondIdx = parseInt(document.querySelector(`.branch-${branchIdx}`).classList[0].split('-')[1]);
                const assignedPriority = parseInt(elem.textContent);
                cipAtoms[atomIdx][assignedPriority-1] = bondIdx;
                // document.querySelector(`[branchIdx="${branchIdx}"][priority]`).classList.remove('rankable');
            });
            // document.querySelectorAll('.cip-priority, .cip-circle').forEach(elem => {
            //     elem.style.setProperty('visibility', 'hidden');
            // });
            refreshSVG(mdetails);
            document.getElementById('assign-priorities').setAttribute('disabled','');
            cipData.priorities = cipAtoms;
            updateCipDataText();
        }
        // Setting priority values of undecided (rankable) branches.
        if (event.target.classList.contains('rankable')) {
            // const branchIdx = event.target.getAttribute('branchIdx');
            priorities = ['1', '2', '3', '4'];
            const newPriority = priorities[(priorities.indexOf(event.target.getAttribute('priority')) + 1) % priorities.length];
            event.target.setAttribute('priority', newPriority);
            document.querySelector(`text[branchIdx="${event.target.getAttribute('branchIdx')}"]`).textContent = newPriority;
        }

        if (event.target.classList.contains('selectable') && !event.target.classList.contains('initial-bond') && !event.target.classList.contains('active-branch')) {
            // console.log(event.target);
            const atomIdx = getAtomIdx(event.target);
            const atomName = getName(atomIdx);
            // If the atom is a stereocenter
            if (isCIPAtom(atomIdx)) {
                
                const svg = moleculeDiv.querySelector('svg');

                event.target.toggleAttribute('stereocenter');

                // Clear errors
                document.querySelectorAll('.atom-highlight').forEach(elem => {
                    if (elem.hasAttribute('error')) elem.removeAttribute('error');
                    elem.classList.remove('selectable');
                });
                document.getElementById('assign-priorities').removeAttribute('disabled');

                // Label each bond adjacent to the stereocenter as a selectable initial bond with a given branch ID.
                const adjacentBonds = getAdjacentBonds(atomIdx);
                adjacentBonds.forEach((adjacentBond, idx) => {
                    const initialBond = document.querySelector(`.bond-${adjacentBond.bondIdx}.bond-highlight`);
                    initialBond.classList.add(`branch-${idx+1}`, 'rankable');

                    initialBond.setAttribute('branchIdx', `${idx+1}`);
                    initialBond.setAttribute('priority', '1');

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
                highest (1) to lowest (4). Once finished, click on "Assign priorities".`;
            } else {
                document.querySelectorAll('.atom-highlight').forEach(elem => {
                    if (elem.hasAttribute('error')) elem.removeAttribute('error');
                });
                event.target.toggleAttribute('error');
                feedback.textContent = `This ${atomName} atom is not a stereocenter since it is not bonded to 4 different substituents.`;
            }
        } 
    }

    const controller = new AbortController();
    main.addEventListener('click', handleMoleculeInteraction, { signal: controller.signal });
    return controller;
}

const writeMolFileFromSmiles = () => {
    let rdkitMol = RDKitModule.get_mol(RDKitModule.get_mol(document.getElementById('smiles').value).get_new_coords(true));
    document.getElementById('mol-file-textarea').value = rdkitMol.get_v3Kmolblock();
}

const saveFile = () =>  {
    const element = document.createElement('a');
    const content = document.getElementById('mol-file-textarea').value;
    const filename = document.getElementById('filename').value;
    const blob = new Blob([content], { type: 'plain/text' });
    const fileUrl = URL.createObjectURL(blob);
    element.setAttribute('href', fileUrl);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

let controller;
const handleClickEvent = event => {
    if (event.target.id == 'sketcher-mol-file') {
        writeMolFileFromSketcher();
    } else if (event.target.id == 'smiles-mol-file') {
        writeMolFileFromSmiles();
    } else if (event.target.id == 'save-mol-file') {
        saveFile();
    } else if (event.target.id == 'read-mol-file') {
        if (controller !== undefined) {
            controller.abort();
        }
        let molblock = document.getElementById('mol-file-textarea').value;
        controller = loadMoleculeWithRDKit(molblock);
    }
}

main.addEventListener('click', handleClickEvent);
