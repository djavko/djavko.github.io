import * as metrics from "https://cdn.jsdelivr.net/npm/graphology-metrics@2.4.0/+esm";

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

const graphFromMolecule = molecule => {
    const graph = new graphology.UndirectedGraph();
    graph.import({
        nodes: molecule.atoms.map((_,i)=>({key: i.toString()})),
        edges: molecule.bonds.map((obj,i) => ({key: i.toString(), source: obj.atoms[0].toString() , target: obj.atoms[1].toString() }))
    });
    return graph;
}

const pruneLeaves = G => {
  const H = G.copy();

  let changed = true;

  while (changed) {
    changed = false;

    const toRemove = [];

    H.forEachNode(node => {
      if (H.degree(node) === 1) {
        toRemove.push(node);
      }
    });

    if (toRemove.length > 0) {
      changed = true;
      toRemove.forEach(node => H.dropNode(node));
    }
  }

  return H;
}

const lineGraphFromGraph = G => {
  const L = new graphology.Graph({type:G.type});

  const incident = new Map();

  G.forEachNode(n => incident.set(n, []));

  G.forEachEdge((e, attr, u, v) => {
    L.addNode(e);
    incident.get(u).push(e);
    incident.get(v).push(e);
  });

  incident.forEach(edges => {
    for (let i=0;i<edges.length;i++)
      for (let j=i+1;j<edges.length;j++)
        L.addUndirectedEdge(edges[i], edges[j]);
  });

  return L;
}

const centralitiesFromGraph = graph => {
    return metrics.centrality.betweenness(graph, {normalized: false});
}

const loadMoleculeWithRDKit = rdkitMol => {

    let mol = JSON.parse(rdkitMol.get_json());
    const molecule = mol.molecules[0];
    const bonds = molecule.bonds.map((_,i)=>i);
    const graph = pruneLeaves(graphFromMolecule(molecule));
    let centralities = [];
    let sortedBondsByCen = [];
    let relativeCentralities = [];
    try {
        centralities = centralitiesFromGraph(lineGraphFromGraph(graph));
        sortedBondsByCen = Object.entries(centralities).toSorted((a, b) => b[1] - a[1]);
        relativeCentralities = sortedBondsByCen.map(bond => bond[1]/sortedBondsByCen[0][1]);
    } catch (error) {
        document.querySelector('#feedback').textContent = "Cannot compute the bond centralities of this molecule. Make sure molecule has a non-trivial structure."

    }
    
    let tableRef = document.getElementById("centralities-table");
 
    const mdetails = {};
    mdetails['bonds'] = bonds;
    mdetails['highlightColour'] = [1,1,1];
    mdetails['width'] = 900;
    mdetails['height'] = 350;
    mdetails['useMolBlockWedging'] = true;
    mdetails['addChiralHs'] = false;
    
    const moleculeDiv = document.getElementById('molecule');
    moleculeDiv.innerHTML= rdkitMol.get_svg_with_highlights(JSON.stringify(mdetails));


    sortedBondsByCen.forEach((bond, i) => {
        const bondIdx = bond[0];
        const centrality = bond[1];
        const color = `rgba(255 0 0 / ${relativeCentralities[i]})`;
        let newRow = tableRef.insertRow(-1);
        let newCell = newRow.insertCell(0);
        newCell.setAttribute('bond_index',bondIdx.toString());
        newCell.style.setProperty("background-color", color);
        newCell.classList.add('selectable');
        newCell.appendChild(document.createTextNode(centrality.toFixed(2)));
        const bondElem = document.querySelector(`path.bond-${bondIdx}`);
        bondElem.classList.add('bond-highlight', 'selectable');
        bondElem.style.setProperty("fill", color);
    });

     const handleMouseOut = event => {
        if (event.target.classList.contains('selectable')) {
            event.target.classList.remove('hovered');
            if (event.target.classList.contains('bond-highlight')) {
                document.querySelector(`[bond_index='${event.target.classList[0].split('-')[1]}']`).classList.remove('hovered');
            } else {
                document.querySelector(`.bond-${event.target.getAttribute('bond_index')}.bond-highlight`).classList.remove('hovered');
            }
        }
    };

    const handleMouseOver = event => {
        if (event.target.classList.contains('selectable')) {
            event.target.classList.add('hovered');
            if (event.target.classList.contains('bond-highlight')) {
                document.querySelector(`[bond_index='${event.target.classList[0].split('-')[1]}']`).classList.add('hovered');
            } else {
                document.querySelector(`.bond-${event.target.getAttribute('bond_index')}.bond-highlight`).classList.add('hovered');
            }
        }
    };

    const main = document.querySelector('main');
  
    const handleMoleculeInteraction = event => {
        if (event.target.classList.contains('selected')) {
            event.target.classList.remove('selected');
            if (event.target.classList.contains('bond-highlight')) {
                document.querySelector(`[bond_index='${event.target.classList[0].split('-')[1]}']`).classList.remove('selected');
            } else {
                document.querySelector(`.bond-${event.target.getAttribute('bond_index')}.bond-highlight`).classList.remove('selected');
            }
        } else {
            if (event.target.classList.contains('selectable')) {
                document.querySelectorAll('.selected').forEach(elem => elem.classList.remove('selected'));
                event.target.classList.add('selected');
                if (event.target.classList.contains('bond-highlight')) {
                    document.querySelector(`[bond_index='${event.target.classList[0].split('-')[1]}']`).classList.add('selected');
                } else {
                    document.querySelector(`.bond-${event.target.getAttribute('bond_index')}.bond-highlight`).classList.add('selected');
                }
            }
        }
        
    }

    const controller = new AbortController();
    main.addEventListener('click', handleMoleculeInteraction, { signal: controller.signal });
    moleculeDiv.addEventListener('mouseout', handleMouseOut, { signal: controller.signal });
    moleculeDiv.addEventListener('mouseover', handleMouseOver, { signal: controller.signal });
    tableRef.addEventListener('mouseout', handleMouseOut, { signal: controller.signal });
    tableRef.addEventListener('mouseover', handleMouseOver, { signal: controller.signal });
    return controller;
}


let controller;
const abortDefinedController = () => {
    if (controller !== undefined) {
            controller.abort();
    }
}

const handleClickEvent = event => {
    if (event.target.id == 'read-sketcher') {
        abortDefinedController();
        document.querySelector('#feedback').textContent = "";
        document.querySelectorAll('tr ~ tr').forEach(elem=>elem.remove());
        // document.querySelectorAll('tr').forEach(elem=>elem.remove());

        let rdkitMol;
        try {
            rdkitMol = RDKitModule.get_mol(RDKitModule.get_mol(interpreter.write(sketcher.getMolecule())).get_new_coords(true));
            document.getElementById('smiles').value = rdkitMol.get_smiles();
            controller = loadMoleculeWithRDKit(rdkitMol);
        } catch (error) {
            document.querySelector('#feedback').textContent = "RDKit cannot create coordinates for this molecule. Please draw a valid structure."
        }
    } else if (event.target.id == 'read-smiles') {
        abortDefinedController();
        document.querySelector('#feedback').textContent = "";
        document.querySelectorAll('tr ~ tr').forEach(elem=>elem.remove());
        // document.querySelectorAll('tr').forEach(elem=>elem.remove());

        let rdkitMol;
        try {
            rdkitMol = RDKitModule.get_mol(document.getElementById('smiles').value);
            sketcher.loadMolecule(ChemDoodle.readMOL(rdkitMol.get_v3Kmolblock()));
            // rdkitMol = RDKitModule.get_mol(rdkitMol.get_new_coords(true));
            controller = loadMoleculeWithRDKit(rdkitMol);
        } catch (error) {
            document.querySelector('#feedback').textContent = "RDKit cannot parse these SMILES. Please check that they are valid."
        }
    }
}

main.addEventListener('click', handleClickEvent);
