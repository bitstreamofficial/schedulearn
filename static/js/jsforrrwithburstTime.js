document.addEventListener("DOMContentLoaded", function () {
    let jobQueue = [];
    let results = [];
    const BASE_WIDTH = 20; // Set base width per unit of burst time
    let jobCounter = 4; // Start from P4 initially

    // Default Jobs to be added when the page loads
    const defaultJobs = [
        { id: "P1", burst: 10, quantum: 4, arrival: 0 },
        { id: "P2", burst: 5, quantum: 4, arrival: 1 },
        { id: "P3", burst: 8, quantum: 4, arrival: 2 }
    ];

    // Initialize the jobQueue with default jobs
    jobQueue = [...defaultJobs];

    // Update job table and upper gantt chart with default jobs
    updateJobTable();
    addToUpperGantt(defaultJobs);

    // Set default job name in input field (P4 initially)
    document.getElementById("job-name").value = `P${jobCounter}`;
    document.getElementById("job-burst").focus();

    // Add a new job to the job queue
    document.getElementById("add-job-btn").addEventListener("click", function () {
        const jobName = document.getElementById("job-name").value;
        const burstTime = parseInt(document.getElementById("job-burst").value, 10);
        const timeQuantum = parseInt(document.getElementById("job-priority").value, 10);
        const arrivalTime = parseInt(document.getElementById("job-arrival").value, 10) || 0;

        if (jobName && burstTime > 0 && timeQuantum > 0) {
            jobQueue.push({ 
                id: jobName, 
                burst: burstTime, 
                quantum: timeQuantum,
                arrival: arrivalTime
            });
            updateJobTable();
            addToUpperGantt([{ 
                id: jobName, 
                burst: burstTime, 
                quantum: timeQuantum,
                arrival: arrivalTime
            }]);
            
            // Reset input fields
            document.getElementById("job-name").value = '';
            document.getElementById("job-burst").value = '';
            document.getElementById("job-priority").value = '';
            document.getElementById("job-arrival").value = '';
            
            jobCounter++; // Increment the job name counter
            document.getElementById("job-name").value = `P${jobCounter}`; // Set the next job name
        } else {
            alert("Please enter valid job details.");
        }
    });

    // Function to add a job box to the upper Gantt chart (list, not queue)
    function addToUpperGantt(jobs) {
        const upperGanttRow = document.getElementById("upper-gantt-row");

        if (upperGanttRow) {
            jobs.forEach(job => {
                const jobBox = document.createElement("div");
                jobBox.className = "job-box";
                jobBox.innerHTML = `${job.id} (${job.burst}) [A:${job.arrival}]`;
                jobBox.setAttribute('data-burst-time', job.burst);
                jobBox.setAttribute('data-quantum', job.quantum);
                jobBox.setAttribute('data-arrival', job.arrival);
                jobBox.setAttribute('data-status', 'waiting');

                // Add click event to select and remove jobs from the list
                jobBox.addEventListener("click", () => removeJobFromQueue(jobBox, job.id));

                upperGanttRow.appendChild(jobBox);
            });
        } else {
            console.error("Upper Gantt Row not found!");
        }
    }

    // Update the job table (display jobs in the queue)
    function updateJobTable() {
        const tableBody = document.querySelector("#job-table tbody");
        tableBody.innerHTML = "";
        jobQueue.forEach(job => {
            const row = `<tr>
                <td>${job.id}</td>
                <td>${job.burst}</td>
                <td>${job.quantum}</td>
                <td>${job.arrival}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    }

    // Remove job from queue (upper gantt chart) when clicked
    function removeJobFromQueue(jobBox, jobId) {
        const jobIndex = jobQueue.findIndex(job => job.id === jobId);
        if (jobIndex !== -1) {
            jobQueue.splice(jobIndex, 1);
            jobBox.remove();
        }
        updateJobTable();
    }

    // Start simulation when "Simulate RR" is clicked
    document.getElementById("simulate-btn").addEventListener("click", function () {
        if (jobQueue.length === 0) {
            alert("No jobs to simulate.");
            return;
        }

        simulateRoundRobin();
    });

    // Start new simulation, reset the job queue and input fields
    document.getElementById("start-new-simulation-btn").addEventListener("click", function () {
        jobQueue = [];
        updateJobTable();
        document.getElementById("upper-gantt-row").innerHTML = '';

        jobCounter = 1;
        document.getElementById("job-name").value = `P${jobCounter}`;
    });

    // Simulate the Round Robin algorithm with arrival times
    function simulateRoundRobin() {
        // Sort jobs by arrival time
        let allJobs = [...jobQueue].sort((a, b) => a.arrival - b.arrival);
        
        let currentTime = 0;
        results = [];
        let totalTurnAroundTime = 0;
        let totalWaitingTime = 0;

        // Create a copy of jobs to manipulate
        let remainingJobs = allJobs.map(job => ({ 
            ...job, 
            remainingBurst: job.burst,
            firstResponseTime: null
        }));

        // Ready queue to hold jobs that have arrived
        let readyQueue = [];

        while (remainingJobs.length > 0 || readyQueue.length > 0) {
            // Add newly arrived jobs to ready queue
            let arrivingJobs = remainingJobs.filter(job => job.arrival <= currentTime);
            arrivingJobs.forEach(job => {
                if (!readyQueue.some(q => q.id === job.id)) {
                    readyQueue.push(job);
                    remainingJobs = remainingJobs.filter(j => j.id !== job.id);
                }
            });

            // If no jobs in ready queue, move time to next job's arrival
            if (readyQueue.length === 0 && remainingJobs.length > 0) {
                currentTime = remainingJobs[0].arrival;
                continue;
            }

            // Round Robin scheduling for ready queue
            if (readyQueue.length > 0) {
                const job = readyQueue.shift();

                // Record first response time
                if (job.firstResponseTime === null) {
                    job.firstResponseTime = currentTime;
                }

                // Determine execution time (minimum of quantum and remaining burst)
                const executionTime = Math.min(job.quantum, job.remainingBurst);

                // Update current time and remaining burst time
                currentTime += executionTime;
                job.remainingBurst -= executionTime;

                // Add any new jobs that might have arrived during execution
                let newArrivingJobs = remainingJobs.filter(j => j.arrival <= currentTime);
                newArrivingJobs.forEach(newJob => {
                    if (!readyQueue.some(q => q.id === newJob.id)) {
                        readyQueue.push(newJob);
                        remainingJobs = remainingJobs.filter(j => j.id !== newJob.id);
                    }
                });

                // If job is not completed, add back to ready queue
                if (job.remainingBurst > 0) {
                    readyQueue.push(job);
                } else {
                    // Job is completed, calculate metrics
                    const result = {
                        id: job.id,
                        burst: job.burst,
                        arrival: job.arrival,
                        response: job.firstResponseTime,
                        completion: currentTime,
                        tat: currentTime - job.arrival,
                        wt: currentTime - job.arrival - job.burst
                    };

                    results.push(result);
                    totalTurnAroundTime += result.tat;
                    totalWaitingTime += result.wt;
                }
            }
        }

        // Sort results by completion time for visualization
        results.sort((a, b) => a.completion - b.completion);

        displayResults(totalTurnAroundTime, totalWaitingTime);
        visualizeExecution();
    }

    // Display the simulation results in the table
    function displayResults(totalTAT, totalWT) {
        const tableBody = document.querySelector("#result-table tbody");
        tableBody.innerHTML = "";

        results.forEach(result => {
            const row = `<tr>
                <td>${result.id}</td>
                <td>${result.burst}</td>
                <td>${result.arrival}</td>
                <td>${result.response}</td>
                <td>${result.completion}</td>
                <td>${result.tat}</td>
                <td>${result.wt}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        const avgTAT = (totalTAT / results.length).toFixed(2);
        const avgWT = (totalWT / results.length).toFixed(2);

        document.querySelector("#avg-tat span").innerText = avgTAT;
        document.querySelector("#avg-wt span").innerText = avgWT;
    }

    // Visualize job execution in the actual Gantt chart
    function visualizeExecution() {
        const ganttRow = document.getElementById("gantt-row");
        if (!ganttRow) {
            console.error("Gantt Row element not found!");
            return;
        }

        ganttRow.innerHTML = "";  // Clear previous Gantt chart

        let delay = 0;
        let processedJobs = [...results];

        processedJobs.forEach((result, index) => {
            setTimeout(() => {
                // Get the job from the upper Gantt chart
                const upperGanttRow = document.getElementById("upper-gantt-row");

                // If there's still a job in the queue, move it to the actual Gantt chart
                if (upperGanttRow && upperGanttRow.children.length > 0) {
                    // Find and remove the corresponding job box
                    const jobBox = upperGanttRow.querySelector(`div[data-burst-time='${result.burst}']`);
                    if (jobBox) {
                        jobQueue = jobQueue.filter(job => job.id !== result.id);
                        jobBox.remove();
                    }

                    // Create the job element for the actual Gantt chart
                    const jobDiv = document.createElement("td");
                    jobDiv.className = "job";
                    jobDiv.innerHTML = `<div class="text">${result.id} (${result.burst}) [A:${result.arrival}]</div>`;

                    // Set the initial width of the job box to 0
                    jobDiv.style.width = `0%`;

                    // Append the job to the actual Gantt chart
                    ganttRow.appendChild(jobDiv);

                    // Add animation classes for job execution
                    jobDiv.classList.add("executing");

                    // Animate the width of the job box in the Actual Gantt Chart
                    setTimeout(() => {
                        jobDiv.style.transition = `width ${result.burst}s linear`;
                        jobDiv.style.width = `${result.burst * BASE_WIDTH}px`;
                    }, 100);

                    // Create and add completion time
                    const completionTimeDiv = document.createElement("div");
                    completionTimeDiv.className = "completion-time";
                    completionTimeDiv.innerHTML = `${result.completion}`;
                    completionTimeDiv.style.display = "none";

                    // Append it to the job container
                    const jobBoxContainer = document.createElement("div");
                    jobBoxContainer.style.position = "relative";
                    jobBoxContainer.appendChild(jobDiv);
                    ganttRow.appendChild(jobBoxContainer);

                    jobBoxContainer.appendChild(completionTimeDiv);

                    // Show the completion time after job finishes executing
                    setTimeout(() => {
                        completionTimeDiv.style.display = "block";
                    }, result.burst * 1000);
                }
            }, delay);
            delay += result.burst * 1000;
        });

        document.getElementById("execution-status").innerText = "Processing Jobs...";
    }
});