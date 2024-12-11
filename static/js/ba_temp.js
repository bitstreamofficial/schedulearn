document.addEventListener("DOMContentLoaded", function() {
    let processes = [];
    let available = [3, 3, 2]; // Initial available resources
    
    // Cache DOM elements
    const addProcessBtn = document.getElementById("add-process-btn");
    const simulateBtn = document.getElementById("simulate-btn");
    const startNewBtn = document.getElementById("start-new-simulation-btn");
    const processTable = document.querySelector("#process-table tbody");
    const safetySequence = document.getElementById("safety-sequence");
    const executionSteps = document.getElementById("execution-steps");

    // Add process to the simulation
    addProcessBtn.addEventListener("click", function() {
        const processId = document.getElementById("process-id").value;
        const allocation = [
            parseInt(document.getElementById("alloc-a").value) || 0,
            parseInt(document.getElementById("alloc-b").value) || 0,
            parseInt(document.getElementById("alloc-c").value) || 0
        ];
        const maximum = [
            parseInt(document.getElementById("max-a").value) || 0,
            parseInt(document.getElementById("max-b").value) || 0,
            parseInt(document.getElementById("max-c").value) || 0
        ];

        // Validate inputs
        if (!processId) {
            alert("Please enter a process ID");
            return;
        }

        // Add process to array
        processes.push({
            id: processId,
            allocation: [...allocation],
            maximum: [...maximum],
            need: maximum.map((max, i) => max - allocation[i])
        });

        updateProcessTable();
        clearInputs();
        incrementProcessId();
    });

    function clearInputs() {
        ["alloc-a", "alloc-b", "alloc-c", "max-a", "max-b", "max-c"].forEach(id => {
            document.getElementById(id).value = "";
        });
    }

    function incrementProcessId() {
        const processIdInput = document.getElementById("process-id");
        const currentId = parseInt(processIdInput.value.replace("P", ""));
        processIdInput.value = `P${currentId + 1}`;
    }

    function updateProcessTable() {
        processTable.innerHTML = processes.map(process => `
            <tr>
                <td>${process.id}</td>
                ${process.allocation.map(a => `<td>${a}</td>`).join("")}
                ${process.maximum.map(m => `<td>${m}</td>`).join("")}
                ${available.map(av => `<td>${av}</td>`).join("")}
            </tr>
        `).join("");
    }

    // Check system safety
    simulateBtn.addEventListener("click", function() {
        const result = checkSafety();
        if (result.isSafe) {
            animateSafetySequence(result.sequence, result.steps);
        } else {
            safetySequence.innerHTML = '<div class="unsafe">System is in unsafe state!</div>';
        }
    });

    function checkSafety() {
        let work = [...available];
        let finish = processes.map(() => false);
        let safeSeq = [];
        let steps = [];

        while (safeSeq.length < processes.length) {
            let found = false;
            
            for (let i = 0; i < processes.length; i++) {
                if (!finish[i] && canAllocate(processes[i].need, work)) {
                    // Save step information
                    steps.push({
                        processId: processes[i].id,
                        available: [...work],
                        need: [...processes[i].need],
                        allocation: [...processes[i].allocation]
                    });

                    // Process can complete
                    work = work.map((w, j) => w + processes[i].allocation[j]);
                    finish[i] = true;
                    safeSeq.push(processes[i].id);
                    found = true;
                }
            }

            if (!found) {
                if (safeSeq.length < processes.length) {
                    return { isSafe: false };
                }
                break;
            }
        }

        return {
            isSafe: true,
            sequence: safeSeq,
            steps: steps
        };
    }

    function canAllocate(need, work) {
        return need.every((n, i) => n <= work[i]);
    }

    function animateSafetySequence(sequence, steps) {
        safetySequence.innerHTML = '<div class="safe">Safe Sequence: </div>';
        executionSteps.innerHTML = '';

        sequence.forEach((processId, index) => {
            setTimeout(() => {
                // Add process to safety sequence with animation
                const processSpan = document.createElement('span');
                processSpan.className = 'process-step';
                processSpan.textContent = ` ${processId} ${index < sequence.length - 1 ? '→' : ''}`;
                processSpan.style.opacity = '0';
                safetySequence.appendChild(processSpan);

                // Fade in animation
                setTimeout(() => {
                    processSpan.style.transition = 'opacity 0.5s ease-in';
                    processSpan.style.opacity = '1';
                }, 50);

                // Display step information
                const step = steps[index];
                const stepDiv = document.createElement('div');
                stepDiv.className = 'execution-step';
                stepDiv.innerHTML = `
                    <h4>Step ${index + 1}: ${processId}</h4>
                    <p>Available: (${step.available.join(', ')})</p>
                    <p>Need: (${step.need.join(', ')})</p>
                    <p>After execution: (${step.available.map((av, i) => av + step.allocation[i]).join(', ')})</p>
                `;
                stepDiv.style.opacity = '0';
                executionSteps.appendChild(stepDiv);

                setTimeout(() => {
                    stepDiv.style.transition = 'opacity 0.5s ease-in';
                    stepDiv.style.opacity = '1';
                }, 50);
            }, index * 1000);
        });
    }

    // Reset simulation
    startNewBtn.addEventListener("click", function() {
        processes = [];
        available = [3, 3, 2];
        document.getElementById("process-id").value = "P0";
        clearInputs();
        updateProcessTable();
        safetySequence.innerHTML = '';
        executionSteps.innerHTML = '';
    });
});