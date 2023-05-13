---
layout: page
title: chemdoodle
exclude: true
---
<script>
	function alertMolecule(mol) {
	        let message = 'This molecule contains ' + mol.atoms.length + ' atoms and ' + mol.bonds.length + ' bonds.';
	        alert(message);
	    }
		
    let mol = new ChemDoodle.structures.Molecule();
    let carbon = new ChemDoodle.structures.Atom('C');
    let oxygen = new ChemDoodle.structures.Atom('O');
    let bond = new ChemDoodle.structures.Bond(carbon, oxygen, 1);
    mol.atoms[0] = carbon;
    mol.atoms[1] = oxygen;
    mol.bonds[0] = bond;
    alertMolecule(mol);
</script>