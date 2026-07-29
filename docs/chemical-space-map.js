const fetchServerChemicalSpaceCompounds = async () => {
  if (typeof fetchChemicalSpaceCompounds === 'function') {
    return await fetchChemicalSpaceCompounds();
  }
  return [];
};

const descriptorKeys = [
  'MolWt',
  'HeavyAtomCount',
  'NumHDonors',
  'NumHAcceptors',
  'NumRotatableBonds',
  'TPSA',
  'MolLogP',
  'NumAromaticRings'
];

const mean = arr => arr.reduce((sum, val) => sum + val, 0) / arr.length;
const stddev = (arr, meanValue) => {
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - meanValue, 2), 0) / Math.max(arr.length - 1, 1);
  return Math.sqrt(variance || 0);
};
const dot = (a, b) => a.reduce((sum, val, i) => sum + val * b[i], 0);
const matVec = (A, v) => A.map(row => dot(row, v));
const normalize = v => {
  const norm = Math.sqrt(dot(v, v));
  return norm === 0 ? v.map(() => 0) : v.map(x => x / norm);
};
const outer = (a, b) => a.map(ai => b.map(bj => ai * bj));
const subtractMatrices = (A, B) => A.map((row, i) => row.map((val, j) => val - B[i][j]));
const scaleMatrix = (A, s) => A.map(row => row.map(val => val * s));

const standardizeMatrix = matrix => {
  const cols = matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  const means = cols.map(col => mean(col));
  const stds = cols.map((col, idx) => stddev(col, means[idx]) || 1);
  return matrix.map(row => row.map((val, j) => (val - means[j]) / stds[j]));
};

const covarianceMatrix = matrix => {
  const n = matrix.length;
  const m = matrix[0].length;
  const cov = Array.from({ length: m }, () => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += matrix[k][i] * matrix[k][j];
      }
      const value = sum / Math.max(n - 1, 1);
      cov[i][j] = value;
      cov[j][i] = value;
    }
  }
  return cov;
};

const powerIteration = (A, iterations = 100) => {
  let v = Array(A.length).fill(1);
  v = normalize(v);
  for (let i = 0; i < iterations; i++) {
    const Av = matVec(A, v);
    v = normalize(Av);
  }
  const lambda = dot(v, matVec(A, v));
  return { eigenvalue: lambda, eigenvector: v };
};

const computePCA = (matrix, nComponents) => {
  const standardized = standardizeMatrix(matrix);
  let A = covarianceMatrix(standardized);
  const components = [];
  for (let k = 0; k < nComponents; k++) {
    const { eigenvector, eigenvalue } = powerIteration(A);
    components.push(eigenvector);
    const outerProduct = outer(eigenvector, eigenvector);
    A = subtractMatrices(A, scaleMatrix(outerProduct, eigenvalue));
  }
  return standardized.map(row => components.map(v => dot(row, v)));
};

let RDKitModule = null;
const ensureRDKitModule = async () => {
  if (RDKitModule) {
    return RDKitModule;
  }
  if (typeof initRDKitModule !== 'function') {
    throw new Error('RDKit initialization function is not available.');
  }
  RDKitModule = await initRDKitModule();
  return RDKitModule;
};

const formatPublicationLabel = pub => {
  if (!pub) return '';
  return pub;
};

const computeDescriptorsForCompound = (RDKit, compound) => {
  let rdkitMol;
  try {
    rdkitMol = RDKit.get_mol(compound.smiles);
  } catch (error) {
    throw new Error(`RDKit failed to read SMILES for ${compound.name}: ${error}`);
  }
  if (!rdkitMol) {
    throw new Error(`RDKit returned no molecule for ${compound.name}`);
  }
  const descRaw = rdkitMol.get_descriptors();
  const desc = JSON.parse(descRaw || '{}');
  return {
    MolWt: Number(desc.exactmw ?? desc.amw ?? desc.MolWt) || 0,
    HeavyAtomCount: Number(desc.NumHeavyAtoms ?? desc.NumHeavyAtoms) || 0,
    NumHDonors: Number(desc.lipinskiHBD ?? desc.NumHBD ?? desc.NumHDonors) || 0,
    NumHAcceptors: Number(desc.lipinskiHBA ?? desc.NumHBA ?? desc.NumHAcceptors) || 0,
    NumRotatableBonds: Number(desc.NumRotatableBonds ?? desc.NumRotatableBonds) || 0,
    TPSA: Number(desc.tpsa ?? desc.TPSA) || 0,
    MolLogP: Number(desc.CrippenClogP ?? desc.MolLogP) || 0,
    NumAromaticRings: Number(desc.NumAromaticRings ?? desc.NumAromaticRings) || 0
  };
};

const renderCompoundTable = (tableId, compounds) => {
  const tableElement = document.getElementById(tableId);
  if (!tableElement) {
    return;
  }
  if (!compounds || compounds.length === 0) {
    tableElement.innerHTML = '<p>No compounds available.</p>';
    return;
  }
  const rows = compounds.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${c.name}</td>
      <td>${c.smiles}</td>
      <td>${formatPublicationLabel(c.publication || c.paper)}</td>
      <td>${c.MolWt.toFixed(1)}</td>
      <td>${c.TPSA.toFixed(1)}</td>
    </tr>
  `).join('');
  tableElement.innerHTML = `
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="background:#f5f5f5; text-align:left;">
          <th style="padding:0.5rem; border:1px solid #ddd;">ID</th>
          <th style="padding:0.5rem; border:1px solid #ddd;">Name</th>
          <th style="padding:0.5rem; border:1px solid #ddd;">SMILES</th>
          <th style="padding:0.5rem; border:1px solid #ddd;">Publication</th>
          <th style="padding:0.5rem; border:1px solid #ddd;">MolWt</th>
          <th style="padding:0.5rem; border:1px solid #ddd;">TPSA</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const plotCompoundProjection = ({ plotElement, compounds, title, xLabel, yLabel }) => {
  const trace = {
    x: compounds.map(c => c.x),
    y: compounds.map(c => c.y),
    text: compounds.map(c => c.name),
    customdata: compounds.map(c => [c.publication || c.paper || '', Number(c.MolWt ?? 0)]),
    mode: 'markers',
    type: 'scattergl',
    marker: {
      color: compounds.map(c => Number(c.MolWt ?? 0)),
      colorscale: 'Viridis',
      colorbar: { title: 'MolWt' },
      size: 12,
      opacity: 0.9,
      line: { width: 1, color: '#333' }
    },
    hovertemplate: '%{text}<br>MolWt: %{customdata[1]:.1f}<br>Publication: %{customdata[0]}<br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>'
  };

  Plotly.newPlot(plotElement, [trace], {
    title,
    xaxis: { title: xLabel },
    yaxis: { title: yLabel },
    margin: { t: 40, l: 55, r: 35, b: 55 },
    hovermode: 'closest'
  });
};

const renderChemicalSpaceMap = async ({
  plotId,
  detailsId,
  selectedCanvasId,
  selectedCanvasSize = 360,
  title = 'Chemical space projection',
  xLabel = 'Descriptor 1',
  yLabel = 'Descriptor 2'
} = {}) => {
  const plotElement = document.getElementById(plotId);
  if (!plotElement) {
    console.warn(`renderChemicalSpaceMap: element with id '${plotId}' not found.`);
    return;
  }

  const activeCompounds = await fetchServerChemicalSpaceCompounds();
  const detailsElement = detailsId ? document.getElementById(detailsId) : null;
  let selectedCanvas = null;
  if (selectedCanvasId && typeof ChemDoodle !== 'undefined' && ChemDoodle.ViewerCanvas) {
    selectedCanvas = new ChemDoodle.ViewerCanvas(selectedCanvasId, selectedCanvasSize, selectedCanvasSize);
    selectedCanvas.emptyMessage = 'Select a compound on the plot to preview it.';
  }

  if (activeCompounds.length === 0) {
    if (detailsElement) {
      detailsElement.innerHTML = '<p>No compounds found. Ensure the server JSON is available.</p>';
    }
    plotCompoundProjection({ plotElement, compounds: [], title, xLabel, yLabel });
    return;
  }

  const RDKit = await ensureRDKitModule();
  const enrichedCompounds = activeCompounds.map(compound => {
    const descriptors = computeDescriptorsForCompound(RDKit, compound);
    const pub = compound.publication || compound.paper || '';
    return {
      ...compound,
      ...descriptors,
      x: 0,
      y: 0,
      color: Number(descriptors.MolWt ?? 0),
      descriptor: formatPublicationLabel(pub),
      publication: pub
    };
  });

  const matrix = enrichedCompounds.map(c => descriptorKeys.map(k => Number(c[k] ?? 0)));
  if (enrichedCompounds.length === 1) {
    enrichedCompounds[0].x = 0;
    enrichedCompounds[0].y = 0;
  } else {
    const pca = computePCA(matrix, 2);
    pca.forEach((row, index) => {
      enrichedCompounds[index].x = row[0];
      enrichedCompounds[index].y = row[1];
    });
  }

  plotCompoundProjection({ plotElement, compounds: enrichedCompounds, title, xLabel, yLabel });

  const updateSelectedCompound = compound => {
    if (detailsElement) {
      const pub = compound.publication || compound.paper || '';
      const pubHtml = pub && (pub.startsWith('http://') || pub.startsWith('https://')) ? `<a href="${pub}" target="_blank" rel="noopener">${pub}</a>` : (pub || 'none');
      detailsElement.innerHTML = `
        <dl>
          <dt><strong>Name</strong></dt><dd>${compound.name}</dd>
          <dt><strong>ID</strong></dt><dd>${compound.id}</dd>
          <dt><strong>SMILES</strong></dt><dd>${compound.smiles}</dd>
          <dt><strong>Publication</strong></dt><dd>${pubHtml}</dd>
          <dt><strong>X</strong></dt><dd>${compound.x.toFixed(2)}</dd>
          <dt><strong>Y</strong></dt><dd>${compound.y.toFixed(2)}</dd>
        </dl>
      `;
    }

    if (!selectedCanvas || !compound.smiles) {
      return;
    }

    let molecule = null;
    if (typeof ChemDoodle.readSMILES === 'function') {
      try {
        molecule = ChemDoodle.readSMILES(compound.smiles);
      } catch (error) {
        molecule = null;
      }
    }

    if (!molecule && typeof RDKit !== 'undefined' && RDKit) {
      try {
        const rdKitMol = RDKit.get_mol(compound.smiles);
        const molblock = rdKitMol.get_v3Kmolblock();
        molecule = ChemDoodle.readMOL(molblock);
      } catch (error) {
        molecule = null;
      }
    }

    if (molecule) {
      try {
        selectedCanvas.loadMolecule(molecule);
        selectedCanvas.repaint();
      } catch (error) {
        if (detailsElement) {
          detailsElement.innerHTML += `<p style="color:#b00;">Structure preview error: ${error}</p>`;
        }
        selectedCanvas.clear();
      }
    }
  };

  plotElement.on('plotly_click', event => {
    const pointIndex = event.points[0].pointIndex ?? event.points[0].pointNumber;
    const compound = enrichedCompounds[pointIndex];
    if (compound) {
      updateSelectedCompound(compound);
    }
  });
};

window.renderChemicalSpaceMap = renderChemicalSpaceMap;
