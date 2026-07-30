---
layout: page
title: Research
permalink: /research/
---
# Research
We are interested in exploring new chemical space by inventing new chemical reactions and identifying combinations of reactions that enable this goal. We are particulary drawn to photochemistry, and to study of reaction mechanisms.\
<script>
    ChemDoodle.DEFAULT_STYLES.bondLength_2D = 16;
    ChemDoodle.DEFAULT_STYLES.bonds_width_2D = .6;
    ChemDoodle.DEFAULT_STYLES.bonds_saturationWidthAbs_2D = 2.6;
    ChemDoodle.DEFAULT_STYLES.bonds_hashSpacing_2D = 2.5;
    ChemDoodle.DEFAULT_STYLES.atoms_font_size_2D = 10;
    ChemDoodle.DEFAULT_STYLES.atoms_font_families_2D = ['Helvetica', 'Arial', 'sans-serif'];
    ChemDoodle.DEFAULT_STYLES.atoms_displayTerminalCarbonLabels_2D = true;
    ChemDoodle.DEFAULT_STYLES.atoms_useJMOLColors = true;
</script>

## Chemical space map

These are some of the compounds we made. They are plotted in the reduced dimensionality space computed by combining several common molecular descriptors: these are just easily derived numbers like the compound's molecular weight or the number of aromatic rings it has. Because some of these numbers are correlated, or not important in differentiating between the compounds, the "dimensionality reduction" finds their combination that is best able to to separate them; i.e., this combination maximizes the variance between the compounds. 

This map is derived from only 8 features, so you might not find that neighbors are always very similar to each other. Click through to see the structures in the box below.


<div id="chemical-space-map" style="display:grid; gap:1rem; margin-bottom:2rem;">
  <div id="chemical-space-plot" style="min-height:520px; width:100%;"></div>
  <div style="display:flex; flex-wrap:wrap; gap:1rem; align-items:flex-start;">
    <section id="chemical-space-panel" style="flex:1 1 280px; min-width:260px; border:1px solid #ccc; border-radius:0.5rem; padding:1rem; background:#fafafa;">
      <h2 id="chemical-space-title" style="margin-top:0;">Selected Compound</h2>
      <div id="chemical-space-details">
        <p>Click a point in the plot to inspect a compound.</p>
      </div>
    </section>
    <canvas id="selectedMolecule" width="360" height="360" style="width:360px; height:360px; border:1px solid #ccc; border-radius:0.5rem; background:#fff;"></canvas>
  </div>
</div>

<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script src="https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js"></script>
<script src="/chemical-space-data.js"></script>
<script src="/chemical-space-map.js"></script>
<script>
  (async () => {
    try {
      await initRDKitModule();
      await renderChemicalSpaceMap({
        plotId: 'chemical-space-plot',
        detailsId: 'chemical-space-details',
        selectedCanvasId: 'selectedMolecule',
        selectedCanvasSize: 360,
        title: 'Chemical space projection',
        xLabel: 'PC1',
        yLabel: 'PC2'
      });
    } catch (error) {
      console.error('Error rendering chemical space map:', error);
      const details = document.getElementById('chemical-space-details');
      if (details) {
        details.innerHTML = `<p style="color:#b00;">Unable to render the chemical space map: ${error.message}</p>`;
      }
    }
  })();
</script>

## How do we study reaction mechanisms?

As we are primarily exploring what happens when molecules interact with photons, we generaly rely on spectroscopy: absorption of photons in UV-vis, or emission in steady-state fluorescence. Absorption is also very useful for reaction monitoring if a suitable set-up can be devised. \
Depending on the reaction, we also use NMR, EPR, electrochemical methods, infrared spectroscopy, etc. 

## Applications of synthesized molecules

What do these molecules do and can they be useful?

### Biological applications

Through a "cell painting" assay, we found a few compounds that appear "active." Cell painting is a complex experiment, and usually requires numerous validation follow-up experiments to be sure that the active compound is interesting to follow-up with.

We also collaborate with other labs for more specific experiments related to biology.

### Materials science and sensors
We made convenient radical precursors which can initiate polymerization reactions.

We also discovered a convenient way to generate trisulfur radical anions. 


