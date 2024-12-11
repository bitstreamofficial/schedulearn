document.addEventListener("DOMContentLoaded", function () {
    let jobQueue = [];
    let ganttChartEvents = [];
    let jobCounter = 5;

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
        jobCounter = 1;

        // Reset input fields to include new inputs
        document.getElementById("job-name").value = `P${jobCounter}`;
        document.getElementById("job-arrival").value = '';
        document.getElementById("job-burst").value = '';
        document.getElementById("job-queue-level").value = '';

        document.querySelector("#job-table tbody").innerHTML = '';
        upperGanttRow.innerHTML = '';
        ganttRow.innerHTML = '';
        resultTableBody.innerHTML = '';
        avgTATSpan.textContent = '0.00';
        avgWTSpan.textContent = '0.00';
    }

    startNewSimulationBtn.addEventListener("click", resetSimulation);

    // Default Jobs (now with arrival time and queue level)
    const defaultJobs = [
        { id: "P1", arrival: 0, burst: 5, queueLevel: 1 },
        { id: "P2", arrival: 1, burst: 3, queueLevel: 2 },
        { id: "P3", arrival: 2, burst: 1, queueLevel: 3 },
        { id: "P4", arrival: 3, burst: 2, queueLevel: 1 },
        { id: "P5", arrival: 4, burst: 3, queueLevel: 2 }
    ];

    function initializeDefaultJobs() {
        jobQueue = [...defaultJobs];
        updateJobTable();
        addToUpperGantt(defaultJobs);
        document.getElementById("job-name").value = `P${jobCounter + 1}`;
    }

    initializeDefaultJobs();

    // Add Job to Queue
    addJobBtn.addEventListener("click", function () {
        const jobName = document.getElementById("job-name").value;
        const arrivalTime = parseInt(document.getElementById("job-arrival").value, 10);
        const burstTime = parseInt(document.getElementById("job-burst").value, 10);
        const queueLevel = parseInt(document.getElementById("job-queue-level").value, 10);

        if (jobName && !isNaN(arrivalTime) && burstTime > 0 && queueLevel > 0) {
            const newJob = { 
                id: jobName, 
                arrival: arrivalTime,
                burst: burstTime,
                queueLevel: queueLevel
            };
            jobQueue.push(newJob);
            updateJobTable();
            addToUpperGantt([newJob]);

            document.getElementById("job-name").value = `P${++jobCounter}`;
            document.getElementById("job-arrival").value = '';
            document.getElementById("job-burst").value = '';
            document.getElementById("job-queue-level").value = '';
        } else {
            alert("Please enter valid job details (name, arrival time, burst time, and queue level).");
        }
    });

    function updateJobTable() {
        const tableBody = document.querySelector("#job-table tbody");
        tableBody.innerHTML = jobQueue.map(job =>
            `<tr>
                <td>${job.id}</td>
                <td>${job.arrival}</td>
                <td>${job.burst}</td>
                <td>${job.queueLevel}</td>
            </tr>`
        ).join("");
    }

    function addToUpperGantt(jobs) {
        jobs.forEach(job => {
            const jobBox = document.createElement("div");
            jobBox.className = "job-box";
            jobBox.textContent = `${job.id} (A:${job.arrival}, B:${job.burst}, Q:${job.queueLevel})`;
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
        simulateMultilevelQueueScheduling();
    });

    function simulateMultilevelQueueScheduling() {
        // Sort jobs by arrival time first
        let sortedJobs = [...jobQueue].sort((a, b) => a.arrival - b.arrival);
        
        let currentTime = 0;
        ganttChartEvents = [];
        let results = [];

        let totalTurnAroundTime = 0;
        let totalWaitingTime = 0;

        // Group jobs by queue level
        const queueLevels = {};
        sortedJobs.forEach(job => {
            if (!queueLevels[job.queueLevel]) {
                queueLevels[job.queueLevel] = [];
            }
            queueLevels[job.queueLevel].push(job);
        });

        // Process each queue level
        const queueLevelKeys = Object.keys(queueLevels).sort((a, b) => parseInt(a) - parseInt(b));
        
        queueLevelKeys.forEach(level => {
            // Sort jobs within this queue level by arrival time
            const levelJobs = queueLevels[level].sort((a, b) => a.arrival - b.arrival);
            
            levelJobs.forEach(job => {
                // Wait if current time is less than job's arrival time
                if (currentTime < job.arrival) {
                    currentTime = job.arrival;
                }

                // Record Gantt chart event
                ganttChartEvents.push({
                    jobId: job.id,
                    startTime: currentTime,
                    endTime: currentTime + job.burst,
                    burstTime: job.burst,
                    queueLevel: job.queueLevel
                });

                // Calculate metrics
                const completionTime = currentTime + job.burst;
                const turnAroundTime = completionTime - job.arrival;
                const waitingTime = currentTime - job.arrival;

                // Store results
                results.push({ 
                    id: job.id, 
                    arrival: job.arrival,
                    burst: job.burst, 
                    queueLevel: job.queueLevel,
                    firstResponseTime: currentTime,
                    completion: completionTime,
                    tat: turnAroundTime, 
                    wt: waitingTime 
                });

                // Update current time
                currentTime = completionTime;

                // Accumulate total times
                totalTurnAroundTime += turnAroundTime;
                totalWaitingTime += waitingTime;
            });
        });

        displayResults(results, totalTurnAroundTime, totalWaitingTime);
        visualizeGanttChartWithAnimation();
    }

    function displayResults(results, totalTAT, totalWT) {
        resultTableBody.innerHTML = results.map(result =>
            `<tr>
                <td>${result.id}</td>
                <td>${result.arrival}</td>
                <td>${result.burst}</td>
                <td>${result.queueLevel}</td>
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

            // Add queue level indicator
            const queueLevelSpan = document.createElement("span");
            queueLevelSpan.className = "queue-level";
            queueLevelSpan.textContent = `Q${event.queueLevel}`;
            jobBox.appendChild(queueLevelSpan);

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
});