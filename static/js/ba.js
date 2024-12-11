document.addEventListener("DOMContentLoaded", function () {
    let processQueue = [];
    let safeSequenceEvents = [];
    let processCounter = 6;

    // Cache DOM elements
    const addProcessBtn = document.getElementById("add-job-btn");
    const simulateBtn = document.getElementById("simulate-btn");
    const startNewSimulationBtn = document.getElementById("start-new-simulation-btn");
    const upperGanttRow = document.getElementById("upper-gantt-row");
    const ganttRow = document.getElementById("gantt-row");
    const resultTableBody = document.querySelector("#result-table tbody");
    const avgTATSpan = document.querySelector("#avg-tat span");
    const avgWTSpan = document.querySelector("#avg-wt span");

    // Reset Function
    function resetSimulation() {
        processQueue = [];
        safeSequenceEvents = [];
        processCounter = 1;

        document.getElementById("job-name").value = `P${processCounter}`;
        document.getElementById("max-resources").value = '';
        document.getElementById("allocated-resources").value = '';
        document.getElementById("available-resources").value = '';

        document.querySelector("#job-table tbody").innerHTML = '';
        upperGanttRow.innerHTML = '';
        ganttRow.innerHTML = '';
        resultTableBody.innerHTML = '';
        avgTATSpan.textContent = '0.00';
        avgWTSpan.textContent = '0.00';
    }

    startNewSimulationBtn.addEventListener("click", resetSimulation);

    // Default Processes
    const defaultProcesses = [
        { id: "P1", maxResources: [7, 5, 3], allocatedResources: [0, 1, 0], availableResources: [3, 3, 2] },
        { id: "P2", maxResources: [3, 2, 2], allocatedResources: [2, 0, 0], availableResources: [3, 3, 2] },
        { id: "P3", maxResources: [9, 0, 2], allocatedResources: [3, 0, 2], availableResources: [3, 3, 2] },
        { id: "P4", maxResources: [2, 2, 2], allocatedResources: [2, 1, 1], availableResources: [3, 3, 2] },
        { id: "P5", maxResources: [4, 3, 3], allocatedResources: [0, 0, 2], availableResources: [3, 3, 2] }
    ];

    function initializeDefaultProcesses() {
        processQueue = [...defaultProcesses];
        updateProcessTable();
        addToUpperGantt(defaultProcesses);
        document.getElementById("job-name").value = `P${processCounter}`;
    }

    initializeDefaultProcesses();

    // Add Process to Queue
    addProcessBtn.addEventListener("click", function () {
        const processName = document.getElementById("job-name").value;
        const maxResourcesInput = document.getElementById("max-resources").value;
        const allocatedResourcesInput = document.getElementById("allocated-resources").value;
        const availableResourcesInput = document.getElementById("available-resources").value;

        // Parse input strings into arrays of numbers
        const maxResources = maxResourcesInput.split(',').map(x => parseInt(x.trim(), 10));
        const allocatedResources = allocatedResourcesInput.split(',').map(x => parseInt(x.trim(), 10));
        const availableResources = availableResourcesInput.split(',').map(x => parseInt(x.trim(), 10));

        if (processName && 
            maxResources.length === 3 && 
            allocatedResources.length === 3 && 
            availableResources.length === 3 && 
            maxResources.every(x => x >= 0) && 
            allocatedResources.every(x => x >= 0)) {
            
            const newProcess = { 
                id: processName, 
                maxResources, 
                allocatedResources, 
                availableResources 
            };
            processQueue.push(newProcess);
            updateProcessTable();
            addToUpperGantt([newProcess]);

            document.getElementById("job-name").value = `P${++processCounter}`;
            document.getElementById("max-resources").value = '';
            document.getElementById("allocated-resources").value = '';
            document.getElementById("available-resources").value = '';
        } else {
            alert("Please enter valid process details. Ensure three comma-separated non-negative numbers for each input.");
        }
    });

    function updateProcessTable() {
        const tableBody = document.querySelector("#job-table tbody");
        tableBody.innerHTML = processQueue.map(process =>
            `<tr>
                <td>${process.id}</td>
                <td>${process.maxResources.join(', ')}</td>
                <td>${process.allocatedResources.join(', ')}</td>
                <td>${process.availableResources.join(', ')}</td>
            </tr>`
        ).join("");
    }

    function addToUpperGantt(processes) {
        processes.forEach(process => {
            const processBox = document.createElement("div");
            processBox.className = "job-box";
            processBox.textContent = `${process.id} (Max: ${process.maxResources.join(', ')})`;
            processBox.setAttribute('data-id', process.id);
            processBox.addEventListener("click", () => removeProcessFromQueue(process.id));
            upperGanttRow.appendChild(processBox);
        });
    }

    function removeProcessFromQueue(processId) {
        processQueue = processQueue.filter(process => process.id !== processId);
        updateProcessTable();
        const processBox = upperGanttRow.querySelector(`[data-id="${processId}"]`);
        if (processBox) processBox.remove();
    }

    simulateBtn.addEventListener("click", function () {
        if (processQueue.length === 0) {
            alert("No processes to simulate.");
            return;
        }
        simulateBankersAlgorithm();
    });

    function simulateBankersAlgorithm() {
        const processes = [...processQueue];
        const totalResources = processes[0].availableResources.length;
        let availableResources = processes[0].availableResources;
        let safeSequence = [];
        let events = [];

        function canAllocate(process, available) {
            for (let i = 0; i < totalResources; i++) {
                if (process.maxResources[i] - process.allocatedResources[i] > available[i]) {
                    return false;
                }
            }
            return true;
        }

        while (processes.length > 0) {
            let found = false;
            for (let i = 0; i < processes.length; i++) {
                if (canAllocate(processes[i], availableResources)) {
                    // Simulate resource allocation
                    for (let j = 0; j < totalResources; j++) {
                        availableResources[j] += processes[i].allocatedResources[j];
                    }

                    // Record event
                    events.push({
                        processId: processes[i].id,
                        resources: processes[i].allocatedResources.slice()
                    });

                    safeSequence.push(processes[i].id);
                    processes.splice(i, 1);
                    found = true;
                    break;
                }
            }

            if (!found) {
                // Deadlock detected
                alert("Unsafe state! System cannot allocate resources safely.");
                return;
            }
        }

        displayResults(safeSequence, events);
        visualizeSafeSequenceWithAnimation(safeSequence, events);
    }

    function displayResults(safeSequence, events) {
        resultTableBody.innerHTML = events.map((event, index) =>
            `<tr>
                <td>${event.processId}</td>
                <td>${event.resources.join(', ')}</td>
                <td>${index + 1}</td>
            </tr>`
        ).join("");

        avgTATSpan.textContent = safeSequence.join(' → ');
        avgWTSpan.textContent = 'Safe Sequence';
    }

    function visualizeSafeSequenceWithAnimation(safeSequence, events) {
        ganttRow.innerHTML = '';

        function animateSafeSequence(index) {
            if (index >= safeSequence.length) return;

            const processBox = document.createElement("div");
            processBox.className = "job";
            processBox.style.width = `${(1 / safeSequence.length) * 100}%`;
            processBox.style.backgroundColor = getColorForProcess(safeSequence[index]);
            processBox.textContent = safeSequence[index];

            // Add resources info OUTSIDE the job box
            const resourcesSpan = document.createElement("span");
            resourcesSpan.className = "completion-time";
            resourcesSpan.textContent = `Res: ${events[index].resources.join(', ')}`;
            processBox.appendChild(resourcesSpan);

            // Animate entry
            processBox.style.opacity = '0';
            processBox.style.transform = 'translateY(20px)';
            ganttRow.appendChild(processBox);

            setTimeout(() => {
                processBox.style.transition = 'all 0.5s ease-out';
                processBox.style.opacity = '1';
                processBox.style.transform = 'translateY(0)';
            }, 100);

            // Next animation after a delay
            setTimeout(() => {
                animateSafeSequence(index + 1);
            }, 600);
        }

        // Start animation
        animateSafeSequence(0);
    }

    // Generate Colors
    function getColorForProcess(processId) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7', '#A8E6CF'];
        const index = parseInt(processId.slice(1)) % colors.length;
        return colors[index];
    }
});