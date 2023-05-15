---
layout: page
title: chemdoodle
exclude: true
---
<script>
	let myCanvas = new ChemDoodle.ViewerCanvas('id', 150, 150);
	    //the width of the bonds should be .6 pixels
	    myCanvas.styles.bonds_width_2D = .6;
	    //the spacing between higher order bond lines should be 18% of the length of the bond
	    myCanvas.styles.bonds_saturationWidthAbs_2D = 2.6;
	    //the hashed wedge spacing should be 2.5 pixels
	    myCanvas.styles.bonds_hashSpacing_2D = 2.5;
	    //the atom label font size should be 10
	    myCanvas.styles.atoms_font_size_2D = 10;
	    //we define a cascade of acceptable font families
	    //if Helvetica is not found, Arial will be used
	    myCanvas.styles.atoms_font_families_2D = ['Helvetica', 'Arial', 'sans-serif'];
	    //display carbons labels if they are terminal
	    myCanvas.styles.atoms_displayTerminalCarbonLabels_2D = true;
	    //add some color by using JMol colors for elements
	    myCanvas.styles.atoms_useJMOLColors = true;
	    myCanvas.emptyMessage = 'No Data Loaded!';
	    let caffeineMolFile =
	        'Molecule Name\n  CHEMDOOD08070920033D 0   0.00000     0.00000     0\n[Insert Comment Here]\n 14 15  0  0  0  0  0  0  0  0  1 V2000\n   -0.3318    2.0000    0.0000   O 0  0  0  1  0  0  0  0  0  0  0  0\n   -0.3318    1.0000    0.0000   C 0  0  0  1  0  0  0  0  0  0  0  0\n   -1.1980    0.5000    0.0000   N 0  0  0  1  0  0  0  0  0  0  0  0\n    0.5342    0.5000    0.0000   C 0  0  0  1  0  0  0  0  0  0  0  0\n   -1.1980   -0.5000    0.0000   C 0  0  0  1  0  0  0  0  0  0  0  0\n   -2.0640    1.0000    0.0000   C 0  0  0  4  0  0  0  0  0  0  0  0\n    1.4804    0.8047    0.0000   N 0  0  0  1  0  0  0  0  0  0  0  0\n    0.5342   -0.5000    0.0000   C 0  0  0  1  0  0  0  0  0  0  0  0\n   -2.0640   -1.0000    0.0000   O 0  0  0  1  0  0  0  0  0  0  0  0\n   -0.3318   -1.0000    0.0000   N 0  0  0  1  0  0  0  0  0  0  0  0\n    2.0640   -0.0000    0.0000   C 0  0  0  2  0  0  0  0  0  0  0  0\n    1.7910    1.7553    0.0000   C 0  0  0  4  0  0  0  0  0  0  0  0\n    1.4804   -0.8047    0.0000   N 0  0  0  1  0  0  0  0  0  0  0  0\n   -0.3318   -2.0000    0.0000   C 0  0  0  4  0  0  0  0  0  0  0  0\n  1  2  2  0  0  0  0\n  3  2  1  0  0  0  0\n  4  2  1  0  0  0  0\n  3  5  1  0  0  0  0\n  3  6  1  0  0  0  0\n  7  4  1  0  0  0  0\n  4  8  2  0  0  0  0\n  9  5  2  0  0  0  0\n 10  5  1  0  0  0  0\n 10  8  1  0  0  0  0\n  7 11  1  0  0  0  0\n  7 12  1  0  0  0  0\n 13  8  1  0  0  0  0\n 13 11  2  0  0  0  0\n 10 14  1  0  0  0  0\nM  END\n> <DATE>\n07-08-2009\n';
	    let caffeine = ChemDoodle.readMOL(caffeineMolFile);
	    //the bond lengths should be 14.4 pixels
	    caffeine.scaleToAverageBondLength(14.4);
	    myCanvas.loadMolecule(caffeine);
</script>