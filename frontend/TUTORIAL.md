# casimirQ Frontend Tutorial

Complete user guide for the casimirQ Quantum Circuit Simulation Platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Login & Authentication](#login--authentication)
3. [Dashboard Overview](#dashboard-overview)
4. [Circuit Builder](#circuit-builder)
5. [Running Simulations](#running-simulations)
6. [Using Algorithms](#using-algorithms)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js**: v24.14.0 or higher
- **npm**: 11.9.0 or higher
- **Backend running** on http://localhost:3000

### Starting the Application

```bash
# 1. Start Backend (Terminal 1)
cd /home/srinivasan/casimirQ
npm run start:prod

# 2. Start Frontend (Terminal 2)
cd /home/srinivasan/casimirQ/frontend
npm run dev
```

**Access the application at:** http://localhost:5173

---

## Login & Authentication

### Step 1: Access Login Page

Navigate to http://localhost:5173/login

**[SCREENSHOT: Login Page - Full view showing email/password fields and Sign In button]**

*The login page displays:*
- Welcome message
- Email input field
- Password input field
- Sign In button
- Demo credentials hint at bottom

### Step 2: Enter Credentials

Use the demo credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`

**[SCREENSHOT: Login Page - With credentials filled in]**

### Step 3: Sign In

Click the **"Sign In"** button.

**Expected behavior:**
- Button shows "Signing in..." during submission
- On success: Toast notification "Welcome back!" appears
- Automatic redirect to Dashboard

**[SCREENSHOT: Dashboard after successful login]**

### Step 4: Logout (Optional)

To logout:
1. Click your email in the sidebar (bottom left)
2. Click **"Logout"** button

**[SCREENSHOT: Logout button in sidebar]**

---

## Dashboard Overview

The Dashboard is your home screen after logging in.

### Layout

**[SCREENSHOT: Dashboard - Full view showing all sections]**

The Dashboard consists of:

1. **Sidebar (Left)**
   - casimirQ logo
   - Navigation links (Dashboard, Circuit Builder, Simulations, Algorithms)
   - User section with email and logout

2. **Header (Top)**
   - Page title "Dashboard"
   - "New Circuit" button

3. **Stats Cards**
   - Total Circuits
   - Total Qubits
   - Simulations

4. **Recent Circuits Section**
   - List of recently created circuits
   - Click any circuit to open it

### Creating a New Circuit

From the Dashboard:

1. Click the **"New Circuit"** button (top right)
2. System redirects to Circuit Builder

**[SCREENSHOT: New Circuit button and resulting redirect]**

---

## Circuit Builder

The Circuit Builder is the main feature for designing quantum circuits.

### Interface Overview

**[SCREENSHOT: Circuit Builder - Full interface]**

The Circuit Builder has:

1. **Toolbar (Top)**
   - Undo/Redo buttons
   - Clear button
   - Export/Import buttons
   - Save button
   - Simulate button (quantum themed)

2. **Qubit Control**
   - Increase/decrease number of qubits
   - Shows current qubit count

3. **Gate Palette (Left)**
   - Grid of available quantum gates
   - Color-coded by type:
     - Purple: Hadamard, Phase, T gates
     - Red: Pauli-X, Rx gates
     - Green: Pauli-Y, Ry gates
     - Blue: Pauli-Z, Rz gates
     - Amber: CNOT gate

4. **Canvas (Center/Right)**
   - React Flow workspace
   - Drag and drop area for gates
   - Connect gates with edges

### Building Your First Circuit

#### Step 1: Set Qubits

**[SCREENSHOT: Qubit control showing 2 qubits]**

Start with 2 qubits (default).

#### Step 2: Add Gates

1. Click **"H"** (Hadamard) gate in palette
2. Gate appears on canvas

**[SCREENSHOT: Adding H gate - before and after]**

3. Click **"⊕"** (CNOT) gate
4. Position gates by dragging

**[SCREENSHOT: Circuit with H and CNOT gates placed]**

#### Step 3: Connect Gates (if needed)

For multi-qubit gates like CNOT:
- Click and drag from connection points
- Create edges between gates

**[SCREENSHOT: Connected gates with edges]**

#### Step 4: Save Circuit

1. Click **"Save"** button
2. Circuit is saved to your account

**[SCREENSHOT: Save button and success feedback]**

#### Step 5: Run Simulation

1. Click **"Simulate"** button (quantum-themed button)
2. System processes the circuit
3. View results on Simulations page

**[SCREENSHOT: Simulate button and results]**

### Gate Reference

| Gate | Color | Description |
|------|-------|-------------|
| H | Purple | Hadamard - Creates superposition |
| X | Red | Pauli-X (NOT gate) |
| Y | Green | Pauli-Y gate |
| Z | Blue | Pauli-Z gate |
| ⊕ | Amber | CNOT - Controlled NOT |
| S | Purple | Phase gate |
| T | Purple | T gate |
| Rx | Red | Rotation around X-axis |
| Ry | Green | Rotation around Y-axis |
| Rz | Blue | Rotation around Z-axis |

**[SCREENSHOT: Full gate palette with labels]**

### Using Undo/Redo

- **Undo**: Ctrl+Z or click Undo button
- **Redo**: Ctrl+Y or click Redo button
- History: 50 levels of undo/redo

**[SCREENSHOT: Undo/Redo buttons in toolbar]**

### Clearing the Canvas

Click **"Clear"** button to remove all gates.

**[SCREENSHOT: Clear button confirmation]**

---

## Running Simulations

### Step 1: Navigate to Simulations

Click **"Simulations"** in the sidebar.

**[SCREENSHOT: Simulations page]**

### Step 2: View Simulation Jobs

The page shows:
- Total simulations count
- Completed count
- Running count
- Queued count

**[SCREENSHOT: Simulation stats cards]**

### Step 3: View Recent Simulations

List shows:
- Circuit name
- Status (completed, running, queued, failed)
- Creation time
- Execution time

**[SCREENSHOT: Recent simulations list]**

### Step 4: View Results

1. Click **"View"** on any completed simulation
2. See detailed results

**[SCREENSHOT: Simulation results detail]**

### Creating New Simulation

1. Click **"New Simulation"** button
2. Select circuit
3. Configure options
4. Run

**[SCREENSHOT: New simulation workflow]**

---

## Using Algorithms

### Step 1: Navigate to Algorithms

Click **"Algorithms"** in the sidebar.

**[SCREENSHOT: Algorithms page]**

### Step 2: Browse Algorithm Library

Available algorithms:
- **Deutsch-Jozsa**: Determines if function is constant or balanced
- **Grover's**: Searches unsorted database
- **Shor's**: Factors integers
- **BB84**: Quantum key distribution
- **QFT**: Quantum Fourier Transform
- **VQE**: Variational Quantum Eigensolver

**[SCREENSHOT: Algorithm cards grid]**

### Step 3: Select Algorithm

1. Browse algorithm cards
2. Each card shows:
   - Algorithm name
   - Description
   - Qubit count
   - Complexity
   - Category

**[SCREENSHOT: Algorithm card details]**

### Step 4: Run Algorithm

1. Find desired algorithm
2. Click **"Run"** button
3. System creates circuit automatically
4. Redirects to Circuit Builder or Simulations

**[SCREENSHOT: Running an algorithm]**

### Step 5: Copy Algorithm

Click **"Copy"** to copy algorithm code/template.

**[SCREENSHOT: Copy button result]**

---

## Navigation Tips

### Sidebar Navigation

**[SCREENSHOT: Sidebar with all navigation items highlighted]**

| Icon | Name | Description |
|------|------|-------------|
| 📊 | Dashboard | Overview and stats |
| 🔧 | Circuit Builder | Design circuits |
| ▶️ | Simulations | Run and monitor |
| 📚 | Algorithms | Pre-built algorithms |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save circuit |

---

## Troubleshooting

### Issue: Login Not Working

**Symptoms:**
- "Invalid credentials" error
- Nothing happens on click

**Solution:**
1. Verify backend is running on port 3000
2. Check email/password spelling
3. Try demo credentials: `admin@example.com` / `admin123`

**[SCREENSHOT: Login error message]**

### Issue: CORS Error

**Symptoms:**
- Browser console shows CORS policy error
- API requests fail

**Solution:**
1. Ensure backend CORS includes your frontend origin
2. Check both frontend and backend are running
3. Verify ports (3000 for backend, 5173 for frontend)

**[SCREENSHOT: CORS error in browser console]**

### Issue: Circuit Not Saving

**Symptoms:**
- Save button doesn't respond
- Circuits not appearing in Dashboard

**Solution:**
1. Check authentication token hasn't expired
2. Logout and login again
3. Verify network connectivity

**[SCREENSHOT: Network error indication]**

### Issue: Gates Not Appearing

**Symptoms:**
- Clicking gate palette does nothing
- Gates don't show on canvas

**Solution:**
1. Refresh the page
2. Check browser console for errors
3. Clear browser cache

**[SCREENSHOT: Browser console showing errors]**

---

## Quick Reference

### Demo Credentials
```
Email: admin@example.com
Password: admin123
```

### URLs
```
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api/v1
```

### Commands
```bash
# Start Backend
cd /home/srinivasan/casimirQ && npm run start:prod

# Start Frontend
cd /home/srinivasan/casimirQ/frontend && npm run dev
```

---

## Advanced Features

### Export/Import Circuits

**Export:**
1. Click **"Export"** button
2. Choose format (JSON, QASM, etc.)
3. Download file

**[SCREENSHOT: Export dialog]**

**Import:**
1. Click **"Import"** button
2. Select file
3. Upload

**[SCREENSHOT: Import dialog]**

### 3D Bloch Sphere Visualization

Access via Simulations or Visualization endpoints.

**[SCREENSHOT: Bloch sphere visualization]**

---

## Glossary

| Term | Definition |
|------|------------|
| **Qubit** | Quantum bit - basic unit of quantum information |
| **Gate** | Operation applied to qubits |
| **Circuit** | Sequence of quantum gates |
| **Simulation** | Execution of circuit on classical computer |
| **Statevector** | Mathematical representation of quantum state |
| **Superposition** | Qubit in multiple states simultaneously |
| **Entanglement** | Correlation between qubits |

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [FINAL_AUDIT_REPORT.md](../FINAL_AUDIT_REPORT.md)
3. Check browser console for errors

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-27  
**Application Version:** casimirQ v1.0.0

---

## Screenshot Inventory

Paste your screenshots below each placeholder in this document:

1. [ ] Login Page - Full view
2. [ ] Login Page - With credentials
3. [ ] Dashboard - Overview
4. [ ] Logout button in sidebar
5. [ ] New Circuit button
6. [ ] Circuit Builder - Full interface
7. [ ] Adding H gate
8. [ ] Circuit with gates placed
9. [ ] Connected gates
10. [ ] Save circuit
11. [ ] Simulate button
12. [ ] Gate palette reference
13. [ ] Undo/Redo buttons
14. [ ] Simulations page
15. [ ] Simulation stats
16. [ ] Recent simulations list
17. [ ] Algorithms page
18. [ ] Algorithm cards
19. [ ] Sidebar navigation
20. [ ] Error messages

---

*This tutorial was generated for the casimirQ Quantum Circuit Simulation Platform.*
