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
    let Canvas = new ChemDoodle.ViewerCanvas('Canvas', 150, 150);
    Canvas.emptyMessage = 'No Data Loaded!';
		let reactionRXN = '<<<<<<< Local Changes\n$RXN\nReaction Name\n      ChemDoodl051620231113      0\n[Insert Comment Here]\n  4  0\n$MOL\nMolecule Name\n  ChemDodl05162311132D 0   0.00000     0.00000     0\n[Insert Comment Here]\n 11 12  0  0  0  0  0  0  0  0  1 V2000\n    0.0565   -0.2516    0.6326 N   0  0  0  0  0  0  0  0  0  0  0  0\n    0.8919    0.0294   -0.0172 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0288   -1.3376    0.5478 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.7636    0.0935   -0.0490 C   0  0  0  0  0  0  0  0  0  0  0  0\\ No newline at end of file\n=======\n$RXN\nReaction Name\n      ChemDoodl051620231348      0\n[Insert Comment Here]\n  2  0\n$MOL\nMolecule Name\n  ChemDodl05162313482D 0   0.00000     0.00000     0\n[Insert Comment Here]\n  5  5  0  0  0  0  0  0  0  0  1 V2000\n    0.0000    0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8090    0.1816    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.5000   -0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.5000   -0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.8090    0.1816    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  2  3  1  0  0  0  0\n  3  4  1  0  0  0  0\n  4  5  1  0  0  0  0\n  5  1  2  0  0  0  0\nM  END\n$MOL\nMolecule Name\n  ChemDodl05162313482D 0   0.00000     0.00000     0\n[Insert Comment Here]\n  5  5  0  0  0  0  0  0  0  0  1 V2000\n    0.0000    0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.8090    0.1816    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.5000   -0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.5000   -0.7694    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.8090    0.1816    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0  0  0  0\n  2  3  1  0  0  0  0\n  3  4  1  0  0  0  0\n  4  5  1  0  0  0  0\n  5  1  1  0  0  0  0\nM  END\n>>>>>>> External Changes\n'
	let reaction = ChemDoodle.readRXN(reactionRXN);
    Canvas.loadContent(reaction);
	</script>	

