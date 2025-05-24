document.addEventListener('DOMContentLoaded', () => {
    // --- SECTION 1: WEDDING DATE CONFIGURATION ---
    // !!! EDIT THIS DATE FOR YOUR WEDDING !!!
    // Format: "YYYY-MM-DDTHH:MM:SS" (e.g., "2024-12-25T15:00:00" for Dec 25, 2024, 3:00 PM)
    const weddingDateString = "2026-05-23T09:00:00"; 
    // --- END OF WEDDING DATE CONFIGURATION ---

    const weddingDate = new Date(weddingDateString).getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const countdownEl = document.getElementById('countdown');
    const celebrationMessageEl = document.getElementById('celebrationMessage');
    const weddingDateDisplayEl = document.getElementById('weddingDateDisplay');

    // Display the configured wedding date
    if (weddingDateDisplayEl) {
        const displayDate = new Date(weddingDateString);
        weddingDateDisplayEl.textContent = `Our Big Day: ${displayDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${displayDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) {
            countdownEl.style.display = 'none';
            celebrationMessageEl.classList.remove('hidden');
            celebrationMessageEl.classList.add('block'); // Or 'flex' if you need flex properties
            clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    // --- SECTION 2: MILESTONES ---
    const milestoneDescriptionInput = document.getElementById('milestoneDescription');
    const milestoneDateInput = document.getElementById('milestoneDate');
    const addMilestoneBtn = document.getElementById('addMilestoneBtn');
    const milestoneListContainer = document.getElementById('milestoneListContainer');
    const noMilestonesMsg = document.getElementById('noMilestones');

    // --- SECTION 3: INDEXEDDB SETUP ---
    const DB_NAME = 'WeddingCountdownDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'milestones';
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const dbInstance = event.target.result;
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Database initialized successfully');
                resolve(db);
            };

            request.onerror = (event) => {
                console.error('Database error:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async function getMilestonesDB() {
        return new Promise((resolve, reject) => {
            if (!db) {
                console.error("DB not initialized yet for getMilestonesDB");
                return resolve([]); // Or reject, depending on desired error handling
            }
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error('Error fetching milestones:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async function renderMilestones() {
        const milestones = await getMilestonesDB();

        // Clear existing milestones except the "no milestones" message
        while (milestoneListContainer.firstChild && milestoneListContainer.firstChild !== noMilestonesMsg) {
            milestoneListContainer.removeChild(milestoneListContainer.firstChild);
        }
        // If noMilestonesMsg is not already a child (e.g., first render after it was removed)
        if (!milestoneListContainer.contains(noMilestonesMsg) && milestones.length === 0) {
            milestoneListContainer.appendChild(noMilestonesMsg);
        }

        if (milestones.length === 0) {
            noMilestonesMsg.style.display = 'block';
            return;
        }
        noMilestonesMsg.style.display = 'none';
        
        // Sort milestones by date (newest first for display, though input is chronological)
        const sortedMilestones = [...milestones].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedMilestones.forEach((milestone) => {
            const milestoneEl = document.createElement('div');
            milestoneEl.className = 'bg-white/60 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow duration-300';
            
            const descriptionSpan = document.createElement('span');
            descriptionSpan.className = 'font-semibold text-gray-700 flex-grow';
            descriptionSpan.textContent = milestone.description;
            
            const dateSpan = document.createElement('span');
            dateSpan.className = 'text-sm text-pink-600 mt-1 sm:mt-0 sm:ml-4';
            dateSpan.textContent = new Date(milestone.date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); // Add T00:00:00 to avoid timezone issues with date-only strings

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-xs text-red-500 hover:text-red-700 font-semibold mt-2 sm:mt-0 sm:ml-4 py-1 px-2 rounded hover:bg-red-100 transition-colors';
            deleteBtn.textContent = 'Remove';
            deleteBtn.onclick = () => removeMilestone(milestone.id); // Use original index or a unique ID

            milestoneEl.appendChild(descriptionSpan);
            milestoneEl.appendChild(dateSpan);
            milestoneEl.appendChild(deleteBtn);
            milestoneListContainer.prepend(milestoneEl); // Prepend to show newest at top
        });
    }

    async function addMilestoneDB(milestone) {
        return new Promise((resolve, reject) => {
            if (!db) {
                 console.error("DB not initialized yet for addMilestoneDB");
                 return reject("DB not initialized");
            }
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(milestone);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error('Error adding milestone:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }
    
    async function addMilestone() {
        const description = milestoneDescriptionInput.value.trim();
        const date = milestoneDateInput.value;

        if (!description || !date) {
            alert('Please enter both a description and a date for the milestone.');
            return;
        }

        const newMilestone = {
            id: Date.now(), // Simple unique ID
            description: description,
            date: date 
        };

        try {
            await addMilestoneDB(newMilestone);
            renderMilestones();
            milestoneDescriptionInput.value = '';
            milestoneDateInput.value = '';
        } catch (error) {
            console.error('Failed to add milestone:', error);
            alert('Failed to save milestone. Please try again.');
        }
    }

    async function removeMilestoneDB(idToRemove) {
        return new Promise((resolve, reject) => {
             if (!db) {
                 console.error("DB not initialized yet for removeMilestoneDB");
                 return reject("DB not initialized");
            }
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(idToRemove);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                console.error('Error removing milestone:', event.target.errorCode);
                reject(event.target.errorCode);
            };
        });
    }

    async function removeMilestone(idToRemove) {
        try {
            await removeMilestoneDB(idToRemove);
            renderMilestones();
        } catch (error) {
            console.error('Failed to remove milestone:', error);
            alert('Failed to remove milestone. Please try again.');
        }
    }

    addMilestoneBtn.addEventListener('click', addMilestone);
    
    // Initialize DB and then render milestones
    initDB().then(() => {
        renderMilestones(); // Initial render after DB is ready
    }).catch(error => {
        console.error("Failed to initialize DB:", error);
        // Optionally, display a message to the user that milestones cannot be loaded/saved
        alert("Could not initialize the milestone database. Milestones will not be saved or loaded.");
    });

    // Footer current year
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});
