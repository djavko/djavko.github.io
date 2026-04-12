const main = document.querySelector('main');

let RDKitModule;
initRDKitModule().then(function (instance) {
    RDKitModule = instance;
});


const loadMoleculeWithRDKit = smiles => {
    let rdkitMol = RDKitModule.get_mol(smiles);
    rdkitMol.set_new_coords(true);

    const moleculeDiv = document.getElementById('molecule');
    moleculeDiv.innerHTML= rdkitMol.get_svg();

    let mol = JSON.parse(rdkitMol.get_json());
    const molecule = mol.molecules[0];
    molecule.atoms.forEach(atom => {
        if(!Object.keys(atom).includes('chg')) atom['chg'] = mol.defaults.atom.chg;
        if(!Object.keys(atom).includes('impHs')) atom['impHs'] = mol.defaults.atom.impHs;
    });

    const highlightSmarts = smarts => {
        try {
            const qmol = RDKitModule.get_qmol(smarts);
            const match = rdkitMol.get_substruct_match(qmol);
            
            // const atomIdx = JSON.parse(match).atoms[0];
            // molecule.atoms[atomIdx].impHs = molecule.atoms[atomIdx].impHs - 1;
            // molecule.atoms[atomIdx].chg = molecule.atoms[atomIdx].chg - 1;

            // rdkitMol = RDKitModule.get_mol(JSON.stringify(mol));

            moleculeDiv.innerHTML = rdkitMol.get_svg_with_highlights(match);
        } catch (error) {
            document.getElementById('feedback').textContent = error;    
        }
    }

    const handleReadSmarts = event => {
        if (event.target.id == 'read-smarts') {
            highlightSmarts(document.getElementById('smarts').value);
        }
    }

    const controller = new AbortController();
    main.addEventListener('click', handleReadSmarts, { signal: controller.signal });
    return controller;
}


let controller;
const handleClickEvent = event => {
    if (event.target.id == 'read-smiles') {
        if (controller !== undefined) {
            controller.abort();
        }
        let smiles = document.getElementById('smiles').value;
        controller = loadMoleculeWithRDKit(smiles);
    }
}

main.addEventListener('click', handleClickEvent);