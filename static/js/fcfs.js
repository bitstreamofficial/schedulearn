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
        { id: "P1", arrival: 0, burst: 5 },
        { id: "P2", arrival: 2, burst: 3 },
        { id: "P3", arrival: 1, burst: 1 },
        { id: "P4", arrival: 3, burst: 2 },
        { id: "P5", arrival: 4, burst: 3 }
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
        const arrivalTime = parseInt(document.getElementById("job-arrival").value, 10);

        if (jobName && burstTime > 0 && arrivalTime >= 0) {
            const newJob = { 
                id: jobName, 
                arrival: arrivalTime, 
                burst: burstTime 
            };
            jobQueue.push(newJob);
            updateJobTable();
            addToUpperGantt([newJob]);

            document.getElementById("job-name").value = `P${++jobCounter}`;
            document.getElementById("job-burst").value = '';
            document.getElementById("job-arrival").value = '';
        } else {
            alert("Please enter valid job details.");
        }
    });

    function updateJobTable() {
        const tableBody = document.querySelector("#job-table tbody");
        tableBody.innerHTML = jobQueue.map(job =>
            `<tr><td>${job.id}</td><td>${job.arrival}</td><td>${job.burst}</td></tr>`
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
        simulateFirstComeFirstServe();
    });

    function simulateFirstComeFirstServe() {
        // Sort jobs by arrival time
        let sortedJobs = [...jobQueue].sort((a, b) => a.arrival - b.arrival);
        
        let currentTime = 0;
        ganttChartEvents = [];
        let results = [];

        let totalTurnAroundTime = 0;
        let totalWaitingTime = 0;

        sortedJobs.forEach(job => {
            // If current time is less than arrival time, move current time to arrival time
            if (currentTime < job.arrival) {
                currentTime = job.arrival;
            }

            // Record Gantt chart event
            ganttChartEvents.push({
                jobId: job.id,
                startTime: currentTime,
                endTime: currentTime + job.burst,
                burstTime: job.burst
            });

            // Calculate metrics
            const firstResponseTime = currentTime;
            const completionTime = currentTime + job.burst;
            const turnAroundTime = completionTime - job.arrival;
            const waitingTime = firstResponseTime - job.arrival;

            // Store results
            results.push({ 
                id: job.id, 
                burst: job.burst, 
                arrival: job.arrival,
                firstResponseTime: firstResponseTime,
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

        displayResults(results, totalTurnAroundTime, totalWaitingTime);
        visualizeGanttChartWithAnimation();
    }

    function displayResults(results, totalTAT, totalWT) {
        resultTableBody.innerHTML = results.map(result =>
            `<tr>
                <td>${result.id}</td>
                <td>${result.burst}</td>
                <td>${result.arrival}</td>
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
});