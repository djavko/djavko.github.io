const main = document.querySelector('main');
const acidsDataRequest = new XMLHttpRequest();
let acidStrengthData;
let controller;
let RDKitModule;

const loadMoleculeWithRDKit = structures => {
    for (let index = 0; index < structures.length; index++) {
        const { smiles, smarts, name } = structures[index];
        let rdkitMol = RDKitModule.get_mol(smiles);
        const moleculeDiv = document.getElementById(`molecule-${index}`);
        const qmol = RDKitModule.get_qmol(smarts);
        const match = JSON.parse(rdkitMol.get_substruct_match(qmol));
        match.legend = name;
        moleculeDiv.innerHTML = rdkitMol.get_svg_with_highlights(JSON.stringify(match));
        moleculeDiv.setAttribute('ind', `${index}`);
        structures[index]['ind'] = `${index}`;
    }

    const handleVerifyAnswer = event => {
        
        if (event.target.id == 'verify-answer') {
            document.getElementById('verify-answer').setAttribute('disabled', '');
            const correctAnswer = structures.sort((a, b) => a.pka - b.pka).map(structure => structure.ind);
            const answerMap = Object.fromEntries(correctAnswer.map((answer, i) => [answer, `${i+1}`]));
            let correctCount = 0;
            Array.from(document.getElementById('drag-elements').children).forEach((element, i) => {
                const indexElement = document.createElement("p");
                const pkaElement = document.createElement("span");
                const ind = element.getAttribute('ind');                
                indexElement.textContent = answerMap[ind];
                indexElement.classList.add('index');
                element.appendChild(indexElement);
                element.classList.add('unselectable');
                if (ind == correctAnswer[i]) {
                    element.classList.add('correct');
                    correctCount++;
                } else {
                    element.classList.add('incorrect');
                }
                pkaElement.textContent = `pka: ${structures[answerMap[ind]-1].pka}`;
                element.appendChild(pkaElement);
            });
            let feedback = correctCount == 3 ? 'Excellent! You arranged all 3 molecules correctly.' : `You arranged ${correctCount} of the 3 molecules correctly.`;
            document.getElementById('feedback').textContent = feedback;
            document.getElementById('next-problem').removeAttribute('disabled');

        }
    }

    const controller = new AbortController();
    main.addEventListener('click', handleVerifyAnswer, { signal: controller.signal });
    return controller;
    
}
  
const selectThreeMolecules = arr => {
    // Helper function to check if a number is at least 1.5 away from all numbers in a list
    function isFarEnough(num, selected) {
        return selected.every(selectedNum => Math.abs(num - selectedNum) >= 1.5);
    }
  
    let selected = [];
    let molecules = [];
  
    while (selected.length < 3) {
      // If it's impossible to find three numbers, return an empty array
      if (arr.length === 0) {
        return []; 
      }
  
      // Randomly pick an index and select that number
      const index = Math.floor(Math.random() * arr.length);
      const num = arr[index].pka;
  
      // Check if the number is far enough from the already selected numbers
      if (isFarEnough(num, selected)) {
        selected.push(num);
        molecules.push(acidStrengthData[arr[index].index]);
      }
  
      // Remove the selected number to avoid reselection
      arr.splice(index, 1);
    }
  
    return molecules;
}

const createProblem = () => selectThreeMolecules([...acidStrengthData.map((entry, i) => ({ index: i, pka: entry.pka }))]);


const handleAcidStrengthData = () => {
    if (acidsDataRequest.readyState === XMLHttpRequest.DONE) {
        if (acidsDataRequest.status === 200) {
            acidStrengthData = JSON.parse(atob(acidsDataRequest.responseText)).molecules;
            const problem = createProblem();
            controller = loadMoleculeWithRDKit(problem);
            document.getElementById('next-problem').setAttribute('disabled','');
        } else {
            alert("There was a problem finding the necessary data.");
        }
      }
}

initRDKitModule().then(function (instance) {
    RDKitModule = instance;
    acidsDataRequest.onreadystatechange = handleAcidStrengthData;
    acidsDataRequest.open("GET", "acid-strength/acid-strength-data.txt");
    acidsDataRequest.send();
});

const handleClickEvent = event => {
    if (event.target.id == 'next-problem') {
        
        if (controller !== undefined) {
            controller.abort();
        }
        Array.from(document.getElementById('drag-elements').children).forEach(element => {
            element.classList.remove('correct');
            element.classList.remove('incorrect');
            element.classList.remove('unselectable');
        });
        const problem = createProblem();
        controller = loadMoleculeWithRDKit(problem);
        document.getElementById('next-problem').setAttribute('disabled','');
        document.getElementById('verify-answer').removeAttribute('disabled');

        document.getElementById('feedback').textContent = '';
    }
}

main.addEventListener('click', handleClickEvent);
dragula([document.querySelector('#drag-elements')],{
    direction: 'horizontal',             // Y axis is considered when determining where an element would be dropped
    copy: false,                       // elements are moved by default, not copied
    copySortSource: false,             // elements in copy-source containers can be reordered
    revertOnSpill: false,              // spilling will put the element back where it was dragged from, if this is true
    removeOnSpill: false,              // spilling will `.remove` the element, if this is true
    slideFactorX: 0,               // allows users to select the amount of movement on the X axis before it is considered a drag instead of a click
    slideFactorY: 0,               // allows users to select the amount of movement on the Y axis before it is considered a drag instead of a click
  });
