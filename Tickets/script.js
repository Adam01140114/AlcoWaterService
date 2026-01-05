// Modern SCADA Ticketing System JavaScript

// Global variables
let ticketCounter = 1;

// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyDgqB5FaU1Zreq3H5WwfDo7WSUEkVOdKxU",
    authDomain: "formfiller-b9856.firebaseapp.com",
    projectId: "formfiller-b9856",
    storageBucket: "formfiller-b9856.appspot.com",
    messagingSenderId: "424653050423",
    appId: "1:424653050423:web:dfae46bc004eaedefae5b2",
    measurementId: "G-9WPM6EEMQ7"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cookie management
function setCookie(name, value, seconds) {
    var expires = "";
    if (seconds) {
        var date = new Date();
        date.setTime(date.getTime() + (seconds * 604800));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

// Password authentication
function authenticateUser() {
    const accessTime = getCookie('access_time');
    if (accessTime) {
        const ageInSeconds = (new Date() - new Date(accessTime)) / 1000;
        if (ageInSeconds < 60) {
            document.getElementById('secret').style.display = 'block';
            return;
        }
    }

    let password = prompt("Please enter the password to access this page:");
    if (password === "Scada" || password === "scada") {
        document.getElementById('secret').style.display = 'block';
        setCookie('access_time', new Date().toISOString(), 60);
    } else {
        alert("Incorrect password. You cannot access this page.");
    }
}

// Ticket management functions
window.submitTicket = async () => {
    const title = document.getElementById('ticketTitle').value;
    const requester = document.getElementById('ticketRequester').value;
    const description = document.getElementById('ticketDesc').value;
    const priority = document.getElementById('ticketPriority').value;

    if (title && requester && description) {
        try {
            const docRef = await addDoc(collection(db, "tickets"), {
                title: title,
                requestor: requester,
                description: description,
                priority: priority,
                status: "New",
                created: new Date()
            });

            console.log("Ticket submitted with ID:", docRef.id);
            
            // Clear form
            document.getElementById('ticketTitle').value = '';
            document.getElementById('ticketRequester').value = '';
            document.getElementById('ticketDesc').value = '';
            document.getElementById('ticketPriority').value = 'Low';
            
            loadTickets();
        } catch (error) {
            console.error("Error submitting ticket:", error);
            alert("Error submitting ticket. Please try again.");
        }
    } else {
        alert("Please fill in all required fields.");
    }
};

window.loadTickets = async () => {
    console.log("Loading tickets...");
    const openTicketsList = document.getElementById('openTicketsList');
    const pendingTicketsList = document.getElementById('pendingTicketsList');
    const deletedTicketsList = document.getElementById('deletedTicketsList');
    const filter = document.getElementById('sortFilter').value;

    // Clear the existing content
    openTicketsList.innerHTML = '';
    pendingTicketsList.innerHTML = '';
    deletedTicketsList.innerHTML = '';

    try {
        const ticketsCollection = collection(db, "tickets");
        const querySnapshot = await getDocs(ticketsCollection);
        console.log(`Number of tickets fetched: ${querySnapshot.size}`);

        // Map priorities to values for sorting
        const priorityValues = { 'High': 3, 'Medium': 2, 'Low': 1 };

        // Convert documents into an array and sort by priority and then by creation date
        const tickets = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                if (priorityValues[b.priority] === priorityValues[a.priority]) {
                    return a.created.toDate() - b.created.toDate();
                }
                return priorityValues[b.priority] - priorityValues[a.priority];
            });

        // Reset ticket counter for pending tickets
        ticketCounter = 1;

        tickets.forEach((ticket) => {
            const ticketHTML = createTicketHTML(ticket.id, ticket);

            if (ticket.status === "Recently Deleted") {
                deletedTicketsList.innerHTML += ticketHTML;
            } else if (ticket.status === "New") {
                openTicketsList.innerHTML += ticketHTML;
            } else if (ticket.status.startsWith("Assigned to")) {
                const assignedPerson = ticket.status.split("Assigned to ")[1];
                if (filter === 'all' || assignedPerson === filter) {
                    pendingTicketsList.innerHTML += ticketHTML;
                }
            }
        });
    } catch (error) {
        console.error("Error loading tickets:", error);
        alert("Error loading tickets. Please refresh the page.");
    }
};

function createTicketHTML(docId, ticket) {
    const createdAt = ticket.created.toDate();
    const formattedCreationDate = createdAt.toLocaleDateString("en-US", {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Check the status and adjust display text if necessary
    let displayStatus = ticket.status;
    if (ticket.status === "New") {
        displayStatus = "Unassigned";
    }

    // Add ticket number for pending tickets
    let ticketNumberHTML = '';
    if (ticket.status.startsWith("Assigned to")) {
        ticketNumberHTML = `<div class="ticket-number">${ticketCounter++}</div>`;
    }

    let ticketDetails = `
        <div class='ticket-item ${ticket.priority.toLowerCase()}-priority'>
            ${ticketNumberHTML}
            <div class='ticket-title'>${ticket.title}</div>
            <div class='ticket-meta'>
                <span><strong>From:</strong> ${ticket.requestor}</span>
                <span class='priority-${ticket.priority.toLowerCase()}'>${ticket.priority} Priority</span>
                <span><strong>Created:</strong> ${formattedCreationDate}</span>
                <span class='status-${ticket.status === "New" ? "new" : ticket.status.startsWith("Assigned") ? "assigned" : "deleted"}'>${displayStatus}</span>
            </div>
            <div class='ticket-description'>${ticket.description}</div>
            <div class='ticket-actions'>
                ${getAssignmentControl(docId, ticket.status, ticket.description)}
            </div>
        </div>`;

    return ticketDetails;
}

function getAssignmentControl(docId, status, description) {
    let members = Array.from(document.getElementById('memberSelect').options).map(option => option.value);
    let optionsHTML = members.map(member => `<option value='${member}'>${member}</option>`).join('');

    let controlHTML = ``;
    
    if (status === "New") {
        controlHTML += `
            <select id='assign-${docId}' class="form-control">
                <option value=''>Assign Ticket</option>
                ${optionsHTML}
            </select> 
            <button onclick='assignTicket("${docId}")' class="btn btn-success">Save Assignment</button>
            <button onclick='deleteTicket("${docId}")' class="btn btn-danger">Delete Ticket</button>`;
    } else if (status === "Recently Deleted") {
        controlHTML += `<button onclick='restoreTicket("${docId}")' class="btn btn-warning">Restore Ticket</button>`;
    } else {
        controlHTML += `
            <button onclick='unassignTicket("${docId}")' class="btn btn-warning">Unassign</button>
            <button onclick='deleteTicket("${docId}")' class="btn btn-danger">Delete</button>`;
    }

    return controlHTML;
}

window.assignTicket = async (docId) => {
    const selectedPerson = document.getElementById(`assign-${docId}`).value;
    const ticketRef = doc(db, "tickets", docId);
    
    if (selectedPerson !== '') {
        try {
            await updateDoc(ticketRef, {
                status: `Assigned to ${selectedPerson}`
            });
            console.log("Ticket assigned!");
            loadTickets(); // Only call once
        } catch (error) {
            console.error("Error assigning ticket:", error);
            alert("Error assigning ticket. Please try again.");
        }
    } else {
        alert("Please select someone to assign the ticket.");
    }
};

window.unassignTicket = async (docId) => {
    const ticketRef = doc(db, "tickets", docId);
    try {
        await updateDoc(ticketRef, {
            status: "New"
        });
        console.log("Ticket unassigned!");
        loadTickets();
    } catch (error) {
        console.error("Error unassigning ticket:", error);
        alert("Error unassigning ticket. Please try again.");
    }
};

window.deleteTicket = async (docId) => {
    if (confirm("Are you sure you want to delete this ticket?")) {
        const ticketRef = doc(db, "tickets", docId);
        try {
            await updateDoc(ticketRef, {
                status: "Recently Deleted",
                deletedAt: new Date()
            });
            console.log("Ticket marked as recently deleted!");
            loadTickets();
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("Error deleting ticket. Please try again.");
        }
    }
};

window.restoreTicket = async (docId) => {
    if (confirm("Are you sure you want to re-open this ticket?")) {
        const ticketRef = doc(db, "tickets", docId);
        try {
            await updateDoc(ticketRef, {
                status: "New"
            });
            console.log("Ticket restored!");
            loadTickets();
        } catch (error) {
            console.error("Error restoring ticket:", error);
            alert("Error restoring ticket. Please try again.");
        }
    }
};

// Member management functions
window.loadMembers = async () => {
    try {
        const membersRef = collection(db, "members");
        const memberSnapshot = await getDocs(membersRef);
        let members = memberSnapshot.docs.map(doc => doc.data().name);

        // Sort members alphabetically
        members.sort();

        // Update dropdowns
        updateMemberDropdowns(members);

        // Update the `sortFilter` dropdown with members
        const sortFilter = document.getElementById('sortFilter');
        sortFilter.innerHTML = '<option value="all">All Tickets</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.text = member;
            sortFilter.appendChild(option);
        });

        // Update the `ticketRequester` dropdown with members
        const ticketRequester = document.getElementById('ticketRequester');
        ticketRequester.innerHTML = '<option value="" disabled selected>Requested By:</option>';
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member;
            option.text = member;
            ticketRequester.appendChild(option);
        });

        // Update member display
        let memberNamesPara = document.getElementById('memberNamesPara');
        if (!memberNamesPara) {
            memberNamesPara = document.createElement('div');
            memberNamesPara.id = 'memberNamesPara';
            memberNamesPara.className = 'member-list';
            const memberManagementDiv = document.getElementById('allmembers');
            memberManagementDiv.appendChild(memberNamesPara);
        }
        
        memberNamesPara.innerHTML = members.map(member => 
            `<span class="member-item">${member}</span>`
        ).join('');
    } catch (error) {
        console.error("Error loading members:", error);
        alert("Error loading members. Please refresh the page.");
    }
};

function updateMemberDropdowns(members) {
    const memberSelect = document.getElementById('memberSelect');
    const sortFilter = document.getElementById('sortFilter');
    const assignSelects = document.querySelectorAll('[id^="assign-"]');

    memberSelect.innerHTML = '';
    sortFilter.innerHTML = '<option value="all">All Tickets</option>';

    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.text = member;

        memberSelect.appendChild(option.cloneNode(true));
        sortFilter.appendChild(option.cloneNode(true));

        assignSelects.forEach(select => {
            select.appendChild(option.cloneNode(true));
        });
    });
}

window.addMember = async () => {
    let newMemberName = prompt("Enter the name of the new member:");
    if (newMemberName && newMemberName.trim()) {
        try {
            await addDoc(collection(db, "members"), { name: newMemberName.trim() });
            alert("New member added!");
            loadMembers();
        } catch (error) {
            console.error("Error adding member:", error);
            alert("Error adding member. Please try again.");
        }
    }
};

window.deleteMember = async () => {
    const memberSelect = document.getElementById('memberSelect');
    const selectedMember = memberSelect.value;

    if (selectedMember) {
        if (confirm(`Are you sure you want to delete ${selectedMember}?`)) {
            try {
                const membersRef = collection(db, "members");
                const q = query(membersRef, where("name", "==", selectedMember));
                const querySnapshot = await getDocs(q);
                
                const deletePromises = [];
                querySnapshot.forEach(doc => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                
                await Promise.all(deletePromises);
                loadMembers();
                alert(`${selectedMember} has been deleted.`);
            } catch (error) {
                console.error("Error deleting member:", error);
                alert("Error deleting member. Please try again.");
            }
        }
    } else {
        alert("Please select a member to delete.");
    }
};

// Initialize the application
window.onload = () => {
    authenticateUser();
    loadMembers();
    loadTickets();
};

// Add event listeners for better UX
document.addEventListener('DOMContentLoaded', function() {
    // Add loading states to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.add('loading');
            setTimeout(() => {
                this.classList.remove('loading');
            }, 1000);
        });
    });
});
