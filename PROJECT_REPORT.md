# Smart City Complaint Management System - Project Documentation

## 1. Project Overview
**Title:** AI-Powered Smart City Complaint Management System
**Type:** Final Year Project (Group of 4)
**Objective:** To streamline civic issue reporting and resolution using modern web technologies and AI-assisted prioritization.

---

## 2. Team Modules & Responsibilities
To demonstrate a robust 4-person group project, the system is architected into four distinct modules:

### **Module 1: Frontend Experience & UI/UX (Member 1)**
**Responsibility:** Creating a responsive, accessible, and visually stunning interface.
*   **Key Features:**
    *   Dynamic Dashboard (User & Admin views).
    *   Interactive Maps (Leaflet.js integration).
    *   Real-time notifications and animations.
    *   Glassmorphism design system.

### **Module 2: Core Logic & Backend Simulation (Member 2)**
**Responsibility:** Handling application logic, state management, and routing.
*   **Key Features:**
    *   `App.js` State Management (Store pattern).
    *   CRUD Operations for Complaints.
    *   Session Management (Persistent Login).
    *   Role-Based User Authentication (Admin vs. Citizen).

### **Module 3: Database & Data Persistence (Member 3)**
**Responsibility:** Data modeling, storage efficiency, and integrity.
*   **Key Features:**
    *   Local Storage Schema Design (`sc_users`, `sc_complaints`, `sc_logs`).
    *   Data Serialization/Deserialization.
    *   Activity Logging System (Audit Trails).
    *   Data Export/Reporting Logic.

### **Module 4: AI Engine & Security (Member 4)**
**Responsibility:** Intelligent features and system protection.
*   **Key Features:**
    *   **Auto-Priority Assignment:** Regex-based NLP to detect keywords like "fire", "danger".
    *   **Spam Detection:** Time-based throttling to prevent flooding.
    *   **Duplicate Detection:** Identifying similar complaints in the same location.
    *   **Security:** Input sanitization (XSS prevention) and basic validation.

---

## 3. Technical Stack
*   **Frontend:** HTML5, CSS3 (Custom Variables/Animations), JavaScript (ES6+).
*   **Libraries:** FontAwesome (Icons), Leaflet.js (Maps), Google Fonts.
*   **Data Store:** Browser LocalStorage (Simulated NoSQL DB).
*   **Architecture:** MVC (Model-View-Controller) pattern within Client-Side JS.

## 4. System Workflow
1.  **User Action:** Logs in and files a complaint (e.g., "Pothole on Main St").
2.  **frontend (M1):** Captures input via Modal Form.
3.  **Security (M4):** Sanitizes input and checks for spam.
4.  **AI Engine (M4):** Analyzes text -> Assigns "Medium Priority", Category "Roads".
5.  **Backend Logic (M2):** Creates complaint object, adds timestamp.
6.  **Database (M3):** Saves to `localStorage`, appends to Activity Log.
7.  **Admin View:** Dashboard auto-refreshes to show the new item.

---

## 5. Future Enhancements
*   Integration with real Cloud Database (Firebase/MongoDB).
*   Image Recognition for complaint photos.
*   SMS/Email Integration for real-time alerts.
