document.addEventListener("DOMContentLoaded", function () {
    let jobQueue = [];
    let ganttChartEvents = [];
    let jobCounter = 6; // Start from 6 to account for default jobs

    // Cache DOM elements
    const addJobBtn = document.getElementById("add-job-btn");
    const simulateBtn = document.getElementById("simulate-btn");
    const startNewSimulationBtn = document.getElementById("start-new-simulation-btn");
    const upperGanttRow = document.getElementById("upper-gantt-row");
    const ganttRow = document.getElementById("gantt-row");
    const resultTableBody = document.querySelector("#result-table tbody");
    const avgTATSpan = document.querySelector("#avg-tat span");
    const avgWTSpan = document.querySelector("#avg-wt span");

    // Reset Function
    function resetSimulation() {
        jobQueue = [];
        ganttChartEvents = [];
        jobCounter = 1; // Reset to start from P1

        document.getElementById("job-name").value = `P${jobCounter}`;
        document.getElementById("job-burst").value = '';
        document.getElementById("job-priority").value = '';
        document.getElementById("job-arrival").value = '';

        document.querySelector("#job-table tbody").innerHTML = '';
        upperGanttRow.innerHTML = '';
        ganttRow.innerHTML = '';
        resultTableBody.innerHTML = '';
        avgTATSpan.textContent = '0.00';
        avgWTSpan.textContent = '0.00';
    }

    startNewSimulationBtn.addEventListener("click", resetSimulation);

    // Default Jobs
    const defaultJobs = [
        { id: "P1", burst: 5, quantum: 2, arrival: 0 },
        { id: "P2", burst: 3, quantum: 2, arrival: 1 },
        { id: "P3", burst: 1, quantum: 2, arrival: 2 },
        { id: "P4", burst: 2, quantum: 2, arrival: 3 },
        { id: "P5", burst: 3, quantum: 2, arrival: 4 }
    ];

    function initializeDefaultJobs() {
        jobQueue = [...defaultJobs];
        updateJobTable();
        addToUpperGantt(defaultJobs);
        document.getElementById("job-name").value = `P${jobCounter}`;
    }

    initializeDefaultJobs();

    // Add Job to Queue
    addJobBtn.addEventListener("click", function () {
        const jobName = document.getElementById("job-name").value;
        const burstTime = parseInt(document.getElementById("job-burst").value, 10);
        const timeQuantum = parseInt(document.getElementById("job-priority").value, 10);
        const arrivalTime = parseInt(document.getElementById("job-arrival").value, 10) || 0;

        if (jobName && burstTime > 0 && timeQuantum > 0) {
            const newJob = { id: jobName, burst: burstTime, quantum: timeQuantum, arrival: arrivalTime };
            jobQueue.push(newJob);
            updateJobTable();
            addToUpperGantt([newJob]);

            document.getElementById("job-name").value = `P${++jobCounter}`;
            document.getElementById("job-burst").value = '';
            document.getElementById("job-priority").value = '';
            document.getElementById("job-arrival").value = '';
        } else {
            alert("Please enter valid job details.");
        }
    });

    function updateJobTable() {
        const tableBody = document.querySelector("#job-table tbody");
        tableBody.innerHTML = jobQueue.map(job =>
            `<tr><td>${job.id}</td><td>${job.burst}</td><td>${job.quantum}</td><td>${job.arrival}</td></tr>`
        ).join("");
    }

    function addToUpperGantt(jobs) {
        jobs.forEach(job => {
            const jobBox = document.createElement("div");
            jobBox.className = "job-box";
            jobBox.textContent = `${job.id} (A:${job.arrival}, B:${job.burst})`;
            jobBox.setAttribute('data-id', job.id);
            jobBox.addEventListener("click", () => removeJobFromQueue(job.id));
            upperGanttRow.appendChild(jobBox);
        });
    }

    function removeJobFromQueue(jobId) {
        jobQueue = jobQueue.filter(job => job.id !== jobId);
        updateJobTable();
        const jobBox = upperGanttRow.querySelector(`[data-id="${jobId}"]`);
        if (jobBox) jobBox.remove();
    }

    simulateBtn.addEventListener("click", function () {
        if (jobQueue.length === 0) {
            alert("No jobs to simulate.");
            return;
        }
        simulateRoundRobin();
    });

    function simulateRoundRobin() {
        let currentTime = 0;
        ganttChartEvents = [];
        let readyQueue = [];
        let results = [];
        let remainingJobs = jobQueue.map(job => ({ ...job, remainingBurst: job.burst }))
            .sort((a, b) => a.arrival - b.arrival);

        const firstResponseTime = {};
        let totalTurnAroundTime = 0;
        let totalWaitingTime = 0;

        while (remainingJobs.length > 0 || readyQueue.length > 0) {
            while (remainingJobs.length > 0 && remainingJobs[0].arrival <= currentTime) {
                readyQueue.push(remainingJobs.shift());
            }

            if (readyQueue.length === 0) {
                currentTime = remainingJobs[0].arrival;
                continue;
            }

            const job = readyQueue.shift();

            if (!firstResponseTime[job.id]) {
                firstResponseTime[job.id] = currentTime;
            }

            const executionTime = Math.min(job.quantum, job.remainingBurst);

            ganttChartEvents.push({
                jobId: job.id,
                startTime: currentTime,
                endTime: currentTime + executionTime,
                burstTime: executionTime
            });

            currentTime += executionTime;
            job.remainingBurst -= executionTime;

            while (remainingJobs.length > 0 && remainingJobs[0].arrival <= currentTime) {
                readyQueue.push(remainingJobs.shift());
            }

            if (job.remainingBurst > 0) {
                readyQueue.push(job);
            } else {
                const tat = currentTime - job.arrival;
                const wt = tat - job.burst;
                results.push({
                    id: job.id,
                    burst: job.burst,
                    firstResponseTime: firstResponseTime[job.id],
                    completion: currentTime,
                    tat: tat,
                    wt: wt
                });
                totalTurnAroundTime += tat;
                totalWaitingTime += wt;
            }
        }

        displayResults(results, totalTurnAroundTime, totalWaitingTime);
        visualizeGanttChartWithAnimation();
        compareRoundRobinPerformance();
    }

    function displayResults(results, totalTAT, totalWT) {
        resultTableBody.innerHTML = results.map(result =>
            `<tr>
                <td>${result.id}</td>
                <td>${result.burst}</td>
                <td>${result.firstResponseTime}</td>
                <td>${result.completion}</td>
                <td>${result.tat}</td>
                <td>${result.wt}</td>
            </tr>`
        ).join("");

        avgTATSpan.textContent = results.length > 0 ? (totalTAT / results.length).toFixed(2) : '0.00';
        avgWTSpan.textContent = results.length > 0 ? (totalWT / results.length).toFixed(2) : '0.00';
    }

    // Visualize Gantt Chart with Animation
    function visualizeGanttChartWithAnimation() {
        ganttRow.innerHTML = '';
        const totalTime = Math.max(...ganttChartEvents.map(event => event.endTime));

        function animateGanttChart(index) {
            if (index >= ganttChartEvents.length) return;

            const event = ganttChartEvents[index];
            const jobBox = document.createElement("div");
            jobBox.className = "job";
            jobBox.style.width = `${(event.burstTime / totalTime) * 100}%`;
            jobBox.style.backgroundColor = getColorForJob(event.jobId);
            jobBox.textContent = event.jobId;

            // Add completion time OUTSIDE the job box
            const completionTimeSpan = document.createElement("span");
            completionTimeSpan.className = "completion-time";
            completionTimeSpan.textContent = `${event.endTime}`;
            jobBox.appendChild(completionTimeSpan);

            // Animate entry
            jobBox.style.opacity = '0';
            jobBox.style.transform = 'translateY(20px)';
            ganttRow.appendChild(jobBox);

            setTimeout(() => {
                jobBox.style.transition = 'all 0.5s ease-out';
                jobBox.style.opacity = '1';
                jobBox.style.transform = 'translateY(0)';
            }, 100);

            // Next animation after a delay
            setTimeout(() => {
                animateGanttChart(index + 1);
            }, 600);
        }

        // Start animation
        animateGanttChart(0);
    }

    // Generate Colors
    function getColorForJob(jobId) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7', '#A8E6CF'];
        const index = parseInt(jobId.slice(1)) % colors.length;
        return colors[index];
    }

    // New function to run Round Robin with different quantum
    function runRoundRobinWithQuantum(jobs, quantum) {
        let currentTime = 0;
        let readyQueue = [];
        let results = [];
        let remainingJobs = jobs.map(job => ({ ...job, remainingBurst: job.burst, quantum: quantum }))
            .sort((a, b) => a.arrival - b.arrival);
    
        const firstResponseTime = {};
        let totalTurnAroundTime = 0;
        let totalWaitingTime = 0;
    
        while (remainingJobs.length > 0 || readyQueue.length > 0) {
            while (remainingJobs.length > 0 && remainingJobs[0].arrival <= currentTime) {
                readyQueue.push(remainingJobs.shift());
            }
    
            if (readyQueue.length === 0) {
                currentTime = remainingJobs[0].arrival;
                continue;
            }
    
            const job = readyQueue.shift();
    
            if (!firstResponseTime[job.id]) {
                firstResponseTime[job.id] = currentTime;
            }
    
            const executionTime = Math.min(job.quantum, job.remainingBurst);
    
            currentTime += executionTime;
            job.remainingBurst -= executionTime;
    
            while (remainingJobs.length > 0 && remainingJobs[0].arrival <= currentTime) {
                readyQueue.push(remainingJobs.shift());
            }
    
            if (job.remainingBurst > 0) {
                readyQueue.push(job);
            } else {
                const tat = currentTime - job.arrival;
                const wt = tat - job.burst;
                results.push({
                    id: job.id,
                    arrival: job.arrival,
                    burst: job.burst,
                    firstResponseTime: firstResponseTime[job.id],
                    completion: currentTime,
                    tat: tat,
                    wt: wt
                });
                totalTurnAroundTime += tat;
                totalWaitingTime += wt;
            }
        }
    
        return {
            results: results,
            avgTAT: results.length > 0 ? (totalTurnAroundTime / results.length).toFixed(2) : '0.00',
            avgWT: results.length > 0 ? (totalWaitingTime / results.length).toFixed(2) : '0.00'
        };
    }
    

    // Performance Comparison Function
    function compareRoundRobinPerformance() {
        // Create a deep copy of default jobs to prevent mutation
        const jobs = defaultJobs.map(job => ({ ...job }));
    
        // Original quantum
        const originalQuantum = jobs[0].quantum;
    
        // Slightly increase and decrease quantum (ensuring it's at least 1)
        const increasedQuantum = Math.max(1, originalQuantum + Math.ceil(Math.random() * 2));
        const decreasedQuantum = Math.max(1, originalQuantum - Math.ceil(Math.random() * 2));
    
        const originalResults = runRoundRobinWithQuantum(jobs, originalQuantum);
        const increasedResults = runRoundRobinWithQuantum(jobs, increasedQuantum);
        const decreasedResults = runRoundRobinWithQuantum(jobs, decreasedQuantum);
    
        const chartContainer = document.getElementById('performance-chart-container');
        
        // Ensure performance panel is initially hidden
        chartContainer.style.display = 'none';
        chartContainer.classList.remove('visible');
    
        // Trigger visibility after a short delay to allow for Gantt chart animation
        setTimeout(() => {
            chartContainer.style.display = 'flex';
            // Force a reflow to enable transition
            void chartContainer.offsetWidth;
            chartContainer.classList.add('visible');
        }, 1500); // Delay matches Gantt chart animation time
    
        renderPerformanceCharts(
            originalResults.results, 
            increasedResults.results, 
            decreasedResults.results, 
            originalQuantum, 
            increasedQuantum, 
            decreasedQuantum,
            originalResults.avgWT,
            increasedResults.avgWT,
            decreasedResults.avgWT,
            originalResults.avgTAT,
            increasedResults.avgTAT,
            decreasedResults.avgTAT
        );
    }
    
    function renderPerformanceCharts(
        originalData, 
        increasedData, 
        decreasedData, 
        originalQuantum, 
        increasedQuantum, 
        decreasedQuantum,
        originalAvgWT,
        increasedAvgWT,
        decreasedAvgWT,
        originalAvgTAT,
        increasedAvgTAT,
        decreasedAvgTAT
    ) {
        const chartContainer = document.getElementById('performance-chart-container');
        chartContainer.innerHTML = ''; // Clear previous chart
        chartContainer.style.display = 'flex';
        chartContainer.style.justifyContent = 'space-between';
    
        // Create left chart container for Arrival Time vs Waiting Time
        const leftChartContainer = document.createElement('div');
        leftChartContainer.style.width = '48%';
        leftChartContainer.style.height = '400px';
        chartContainer.appendChild(leftChartContainer);
    
        // Create right chart container for Avg Metrics
        const rightChartContainer = document.createElement('div');
        rightChartContainer.style.width = '48%';
        rightChartContainer.style.height = '400px';
        chartContainer.appendChild(rightChartContainer);
    
        // Create canvas elements
        const leftCtx = document.createElement('canvas');
        leftChartContainer.appendChild(leftCtx);
        const rightCtx = document.createElement('canvas');
        rightChartContainer.appendChild(rightCtx);
    
        // Sort data by arrival time to ensure proper line graph
        const sortedOriginalData = originalData.sort((a, b) => a.arrival - b.arrival);
        const sortedIncreasedData = increasedData.sort((a, b) => a.arrival - b.arrival);
        const sortedDecreasedData = decreasedData.sort((a, b) => a.arrival - b.arrival);
    
        // First Chart: Arrival Time vs Waiting Time
        new Chart(leftCtx, {
            type: 'line',
            data: {
                labels: sortedOriginalData.map(item => item.arrival),
                datasets: [
                    {
                        label: `Original Quantum (${originalQuantum})`,
                        data: sortedOriginalData.map(item => item.wt),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: `Increased Quantum (${increasedQuantum})`,
                        data: sortedIncreasedData.map(item => item.wt),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: `Decreased Quantum (${decreasedQuantum})`,
                        data: sortedDecreasedData.map(item => item.wt),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Arrival Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Waiting Time'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Arrival Time vs Waiting Time'
                    }
                }
            }
        });
    
        // Second Chart: Quantum vs Avg Metrics (Line Graph)
        new Chart(rightCtx, {
            type: 'line',
            data: {
                labels: [
                    originalQuantum, 
                    increasedQuantum, 
                    decreasedQuantum
                ],
                datasets: [
                    {
                        label: 'Avg Waiting Time',
                        data: [
                            parseFloat(originalAvgWT), 
                            parseFloat(increasedAvgWT), 
                            parseFloat(decreasedAvgWT)
                        ],
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Avg Turnaround Time',
                        data: [
                            parseFloat(originalAvgTAT), 
                            parseFloat(increasedAvgTAT), 
                            parseFloat(decreasedAvgTAT)
                        ],
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time Quantum'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (units)'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Time Quantum vs Avg Metrics'
                    }
                }
            }
        });
    }
});

