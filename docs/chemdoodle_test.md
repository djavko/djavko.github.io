---
layout: page
title: chemdoodle
exclude: true
---

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
	
<script>
    let Canvas2 = new ChemDoodle.ViewerCanvas('Canvas2', 150, 150);
    Canvas2.emptyMessage = 'No Data Loaded!';
		let XK1387MolFile = 'Molecule Name\n  ChemDodl05152313092D 0   0.00000     0.00000     0\n[Insert Comment Here]\n 12 12  0  0  0  0  0  0  0  0  1 V2000\n   -2.7860    0.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.5950   -0.3184    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -3.2860   -1.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.2860   -1.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -1.9769   -0.3184    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -2.7860    1.2694    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7859    0.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    1.9769   -0.3184    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.2860   -1.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.2859   -1.2694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    3.5950   -0.3184    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    2.7859    1.2694    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  2  3  1  0  0  0  0\n  3  4  1  0  0  0  0\n  4  5  2  0  0  0  0\n  5  1  1  0  0  0  0\n  1  6  2  0  0  0  0\n  7  8  2  0  0  0  0\n  8  9  1  0  0  0  0\n  9 10  1  0  0  0  0\n 10 11  2  0  0  0  0\n 11  7  1  0  0  0  0\n  7 12  1  0  0  0  0\nM  END'
	let XK1387 = ChemDoodle.readMOL(XK1387MolFile);
    Canvas2.loadMolecule(XK1387);
	</script> XK6719:	

