 /* -----------------------
       1) IMPORT FIREBASE SDK
       ----------------------- */
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
    import {
      getAuth, onAuthStateChanged, signOut
    } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
    import {
      initializeFirestore, collection, addDoc, onSnapshot, query, orderBy, where,
      doc, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, getDoc
    } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

    /* -----------------------
       2) FIREBASE CONFIG - GANTI DENGAN MILIKMU
       ----------------------- */
    const firebaseConfig = {
      apiKey: "AIzaSyA3d0-uYWGob0_Rd4DSr--enC8MaudBmu0",
      authDomain: "kendalikas-dc227.firebaseapp.com",
      projectId: "kendalikas-dc227",
      storageBucket: "kendalikas-dc227.firebasestorage.app",
      messagingSenderId: "192223553027",
      appId: "1:192223553027:web:9922ee5d193226bf42d036",
      measurementId: "G-PT69WLETYP"
    };

    /* -----------------------
       3) INISIALISASI
       ----------------------- */

    const app = initializeApp(firebaseConfig);

    /* -----------------------
       3.1) TABLE FUNCTIONS
       ----------------------- */
    function subscribeTables(userId) {
      const q = query(collection(db, 'tables'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      onSnapshot(q, async (snapshot) => {
        const ownedTables = snapshot.docs.map(d => ({ id: d.id, ...d.data(), isOwner: true }));
        tablesData = ownedTables;

        // Also get accessible tables
        await getAccessibleTables(userId);

        if (tablesData.length === 0) {
          await createDefaultTable(userId);
        } else {
          if (!currentTable || !tablesData.find(t => t.id === currentTable)) {
            currentTable = tablesData[0].id;
          }
          await migrateTransactions(userId);
          displayTables();
          subscribeTransactions(userId, currentTable);
        }
      });
    }

    // Get tables the user has access to (but doesn't own)
    async function getAccessibleTables(userId) {
      try {
        // Query without orderBy to avoid composite index requirement
        const q = query(collection(db, 'tableAccess'),
          where('userId', '==', userId),
          where('status', '==', 'granted')
        );
        const snapshot = await getDocs(q);
        const accessibleTables = snapshot.docs.map(d => ({ id: d.id, ...d.data(), isOwner: false }));

        // Sort by grantedAt in memory
        accessibleTables.sort((a, b) => {
          const dateA = a.grantedAt?.toDate?.() || new Date(0);
          const dateB = b.grantedAt?.toDate?.() || new Date(0);
          return dateB - dateA; // descending order
        });

        // Get the actual table data for accessible tables
        for (const access of accessibleTables) {
          const tableRef = doc(db, 'tables', access.tableId);
          const tableSnap = await getDoc(tableRef);
          if (tableSnap.exists()) {
            // Check if table is already in tablesData to avoid duplicates
            if (!tablesData.find(t => t.id === access.tableId)) {
              const tableData = {
                id: access.tableId,
                ...tableSnap.data(),
                isOwner: false,
                accessId: access.id,
                role: access.role || 'viewer' // Store the role information
              };
              tablesData.push(tableData);
            }
          }
        }
      } catch (err) {
        console.error('Error getting accessible tables:', err);
      }
    }

    async function createDefaultTable(userId) {
      try {
        const docRef = await addDoc(collection(db, 'tables'), {
          userId,
          name: 'Default',
          ownerEmail: currentUser.email,
          createdAt: serverTimestamp()
        });
        currentTable = docRef.id;
      } catch (err) {
        console.error('Error creating default table:', err);
      }
    }

    async function migrateTransactions(userId) {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId), where('tableId', '==', null));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { tableId: currentTable });
        });
      await batch.commit();
    }

    function displayTables() {
      const tableList = document.getElementById('tableList');
      let html = '';
      tablesData.sort((a, b) => a.name.localeCompare(b.name));
      tablesData.forEach(table => {
        const isActive = table.id === currentTable;
        const isOwner = table.isOwner;
        const accessStatus = isOwner ? 'Owner' : (table.role ? table.role.charAt(0).toUpperCase() + table.role.slice(1) : 'Viewer');

        // Different styling for owned vs accessed tables
        const backgroundColor = isActive ? '#e3f2fd' : 'white';
        const borderColor = isOwner ? '#4CAF50' : '#2196F3';
        const statusColor = isOwner ? '#4CAF50' : '#2196F3';

        // Set status icon based on role
        let statusIcon;
        if (isOwner) {
          statusIcon = '👑';
        } else if (table.role === 'editor') {
          statusIcon = '✏️';
        } else {
          statusIcon = '👁️';
        }

        html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; margin-bottom: 5px; border-radius: 4px; background: ${backgroundColor}; ${!isActive ? 'cursor: pointer;' : ''}" ${!isActive ? `onclick="switchTable('${table.id}')"` : ''}>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: 600; color: #333;">${table.name}</span>
          <span style="font-size: 12px; color: ${statusColor}; display: flex; align-items: center; gap: 4px;">
            ${statusIcon} ${accessStatus}
          </span>
        </div>
        <div>
          
          <button onclick="event.stopPropagation(); openDeleteTableModal('${table.id}')" style="padding: 6px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px; display: flex; align-items: center; justify-content: center;" title="More Info">
            <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="7" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="17" r="2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
      });
      tableList.innerHTML = html;
    }

    window.switchTable = function (tableId) {
      currentTable = tableId;
      displayTables();
      subscribeTransactions(currentUser.uid, currentTable);
      subscribePendingRequests(currentUser.uid);
      subscribeCollaborators(currentTable);
      closeTableMenu();
    }

    window.deleteTable = async function (tableId) {
      if (tablesData.length <= 1) {
        alert('Cannot delete the last table.');
        return;
      }
      const table = tablesData.find(t => t.id === tableId);
      if (!confirm(`Delete table "${table.name}"? Transactions will be moved to another table.`)) return;
      const otherTable = tablesData.find(t => t.id !== tableId);
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid), where('tableId', '==', tableId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { tableId: otherTable.id });
        });
        await batch.commit();
        await deleteDoc(doc(db, 'tables', tableId));
      } catch (err) {
        console.error('Error deleting table:', err);
        alert('Failed to delete table.');
      }
    }
    const auth = getAuth(app);
    const db = initializeFirestore(app, { experimentalForceLongPolling: true });

    let currentUser = null; // to store current user
    let currentTable = null; // to store current table id
    let tablesData = []; // array of tables
    let notificationsData = []; // array of notifications
    let collaboratorsData = []; // array of collaborators
    let collaboratorsUnsubscribe = null; // to store unsubscribe function for collaborators subscription

    // Function to subscribe to pending access requests for tables owned by current user and filtered by currentTable
    function subscribePendingRequests(userId) {
      if (!currentTable) {
        notificationsData = [];
        displayNotifications();
        return;
      }
      const q = query(
        collection(db, 'tableAccess'),
        where('status', '==', 'pending'),
        where('tableId', '==', currentTable)
      );

      onSnapshot(q, async (snapshot) => {
        const pendingRequests = [];

        for (const docSnap of snapshot.docs) {
          const requestData = { id: docSnap.id, ...docSnap.data() };

          // Check if this user owns the table
          const tableRef = doc(db, 'tables', requestData.tableId);
          const tableSnap = await getDoc(tableRef);

          if (tableSnap.exists() && tableSnap.data().userId === userId) {
            pendingRequests.push(requestData);
          }
        }

        notificationsData = pendingRequests;
        displayNotifications();
      });
    }



// Function to subscribe to collaborators for the current selected table
function subscribeCollaborators(tableId) {
  if (collaboratorsUnsubscribe) {
    collaboratorsUnsubscribe(); // unsubscribe previous listener
    collaboratorsUnsubscribe = null;
  }
  if (!tableId) {
    collaboratorsData = [];
    displayCollaborators();
    return;
  }

  // Get current table info to check if user is owner
  const currentTableData = tablesData.find(t => t.id === tableId);
  console.log('Current table data:', currentTableData);
  console.log('Current table ID:', tableId);
  console.log('Current user ID:', currentUser?.uid);

  // Create query to get all collaborators for this table
  const q = query(
    collection(db, 'tableAccess'),
    where('tableId', '==', tableId),
    where('status', '==', 'granted')
  );

  collaboratorsUnsubscribe = onSnapshot(q, async (snapshot) => {
    console.log('Collaborators snapshot received:', snapshot.docs.length, 'documents');
    const collabs = [];

    // Add the table owner first
    if (currentTableData && currentTableData.userId) {
      // Get the owner's information from the table data
      const ownerName = currentTableData.ownerName || currentTableData.userName || 'Table Owner';
      const ownerEmail = currentTableData.ownerEmail || currentTableData.userEmail || 'owner@example.com';
      collabs.push({
        id: 'owner',
        userId: currentTableData.userId,
        email: ownerEmail,
        name: ownerName,
        role: 'owner',
        status: 'granted',
        isOwner: true
      });
    }

    // Add other collaborators
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      console.log('Collaborator data:', data);
      // Skip if this is the owner
      if (data.userId === currentTableData.userId) continue;
      // Check if collaborator is already in the list to avoid duplicates
      if (!collabs.find(c => c.userId === data.userId)) {
        // Use requestedBy field which contains the email, or fallback to currentUser.email if available
        const email = data.requestedBy || currentUser?.email || 'Unknown Email';
        collabs.push({ id: docSnap.id, ...data, email });
      }
    }

    console.log('Final collaborators data:', collabs);
    collaboratorsData = collabs;
    displayCollaborators();
  }, (error) => {
    console.error('Error subscribing to collaborators:', error);
    collaboratorsData = [];
    displayCollaborators();
  });
}

function displayCollaborators() {
  const collaboratorList = document.getElementById('collaboratorList');
  if (!collaboratorsData || collaboratorsData.length === 0) {
    collaboratorList.innerHTML = '<div class="empty-collaborators" style="text-align: center; padding: 20px; color: #666; font-style: italic;">No collaborators for this table</div>';
    return;
  }
  let html = '';
  collaboratorsData.forEach(collab => {
    // Determine the role display
    let roleDisplay = 'Editor'; // Default for collaborators
    let roleColor = '#2196F3'; // Blue for Editor
    let statusIcon = '✏️'; // Default icon for Editor

    // Check if this is the table owner (should show as Owner)
    const currentTableData = tablesData.find(t => t.id === currentTable);
    if (currentTableData && currentTableData.isOwner && collab.userId === currentUser.uid) {
      // This is the current user and they own the table
      roleDisplay = 'Owner';
      roleColor = '#4CAF50'; // Green for Owner
      statusIcon = '👑'; // Crown icon for Owner
    } else if (currentTableData && collab.userId === currentTableData.userId) {
      // This collaborator is the table owner
      roleDisplay = 'Owner';
      roleColor = '#4CAF50'; // Green for Owner
      statusIcon = '👑'; // Crown icon for Owner
    } else if (collab.role === 'editor') {
      roleDisplay = 'Editor';
      roleColor = '#2196F3'; // Blue for Editor
      statusIcon = '✏️'; // Pencil icon for Editor
    } else {
      roleDisplay = 'Viewer';
      roleColor = '#2196F3'; // Blue for Viewer
      statusIcon = '👁️'; // Eye icon for Viewer
    }

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; margin-bottom: 5px; border-radius: 4px;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
            ${collab.email || 'Unknown'}
          </div>
          <div style="font-size: 12px; color: ${roleColor};">
            Role: ${roleDisplay}
          </div>
        </div>
        <div>
          <!-- Dropdown removed - all accepted users are automatically editors -->
        </div>
      </div>
    `;
  });
  collaboratorList.innerHTML = html;
}

// Function to change collaborator role
window.changeCollaboratorRole = async function(accessId, newRole) {
  try {
    const accessRef = doc(db, 'tableAccess', accessId);
    await updateDoc(accessRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });

    // Update local data to reflect the change immediately
    const collaborator = collaboratorsData.find(c => c.id === accessId);
    if (collaborator) {
      collaborator.role = newRole;
    }

    // Refresh the display
    displayCollaborators();

    alert('Collaborator role updated successfully!');
  } catch (err) {
    console.error('Error updating collaborator role:', err);
    alert('Failed to update collaborator role. Please try again.');
  }
}

    // Function to display notifications in the notification menu
    function displayNotifications() {
      const notificationList = document.getElementById('notificationList');

      if (!notificationsData || notificationsData.length === 0) {
        notificationList.innerHTML = '<div class="empty-notifications" style="text-align: center; padding: 20px; color: #666; font-style: italic;">No new notifications</div>';
        return;
      }

      let html = '';
      notificationsData.forEach(notification => {
        if (notification.tableId !== currentTable) return; // filter by currentTable

        const requestedAt = notification.requestedAt?.toDate?.()
          ? notification.requestedAt.toDate().toLocaleDateString('id-ID', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown time';

        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ddd; margin-bottom: 5px; border-radius: 4px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
                ${notification.requestedBy || 'Unknown User'}
              </div>
              <div style="font-size: 12px; color: #666;">
                Requested access to table
              </div>
              <div style="font-size: 11px; color: #999; margin-top: 2px;">
                ${requestedAt}
              </div>
            </div>
            <div style="display: flex; gap: 5px;">
              <button onclick="acceptAccessRequest('${notification.id}', '${notification.tableId}', '${notification.userId}')"
                      style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                      title="Accept Request">
                ✓ Accept
              </button>
              <button onclick="declineAccessRequest('${notification.id}')"
                      style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                      title="Decline Request">
                ✗ Decline
              </button>
            </div>
          </div>
        `;
      });

      notificationList.innerHTML = html;
    }

    // Function to accept access request
    window.acceptAccessRequest = async function(requestId, tableId, userId) {
      try {
        const requestRef = doc(db, 'tableAccess', requestId);
        await updateDoc(requestRef, {
          status: 'granted',
          role: 'editor',
          grantedAt: serverTimestamp()
        });

        alert('Access request accepted successfully! User now has Editor role.');
      } catch (err) {
        console.error('Error accepting access request:', err);
        alert('Failed to accept access request. Please try again.');
      }
    }

    // Function to decline access request
    window.declineAccessRequest = async function(requestId) {
      try {
        const requestRef = doc(db, 'tableAccess', requestId);
        await updateDoc(requestRef, {
          status: 'denied',
          deniedAt: serverTimestamp()
        });

        alert('Access request declined.');
      } catch (err) {
        console.error('Error declining access request:', err);
        alert('Failed to decline access request. Please try again.');
      }
    }

    /* -----------------------
       4) UI / NAV / MODAL (sama seperti sebelumnya)
       ----------------------- */
    // (copy logic menuToggle, nav links, modal show/close, format input)
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('nav');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        nav.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!menuToggle.contains(e.target) && !nav.contains(e.target)) {
          nav.classList.remove('show');
        }
      });
    }

    const links = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('main section');

    function fadeOut(element, callback) {
      element.style.transition = 'opacity 0.15s ease';
      element.style.opacity = '0';
      setTimeout(() => {
        element.style.pointerEvents = 'none';
        if (callback) callback();
      }, 150);
    }

    function fadeIn(element, callback) {
      element.style.transition = 'opacity 0.15s ease';
      element.style.opacity = '0';
      element.style.pointerEvents = 'auto';
      element.classList.add('active');
      setTimeout(() => {
        element.style.opacity = '1';
        if (callback) callback();
      }, 50);
    }

    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const currentActive = document.querySelector('nav a.active');
        const targetHref = link.getAttribute('href');
        const targetId = targetHref.replace('#', '');
        const targetSection = document.getElementById(targetId);
        if (currentActive && currentActive !== link) {
          const currentSection = document.querySelector('section.active');
          if (currentSection) {
            fadeOut(currentSection, () => {
              links.forEach(l => l.classList.remove('active'));
              link.classList.add('active');
              sections.forEach(sec => {
                sec.classList.remove('active');
                sec.style.opacity = '0';
                sec.style.pointerEvents = 'none';
              });
              fadeIn(targetSection);
            });
          }
        } else if (!currentActive) {
          link.classList.add('active');
          fadeIn(targetSection);
        }
        nav.classList.remove('show');
      });
    });

    // Modal
    const addDataBtn = document.getElementById('addData');
    const menuTambahData = document.getElementById('menutambahdata');

    if (addDataBtn) addDataBtn.addEventListener('click', () => { menuTambahData.classList.add('show'); });
    window.closeMenu = function () {
      menuTambahData.classList.remove('show');
      document.getElementById('transactionForm').reset();
      editingId = null;
      document.getElementById('submitBtn').textContent = 'Simpan Transaksi';
      document.getElementById('modalTitle').textContent = 'Add Transaction Data';
    };
    menuTambahData.addEventListener('click', (e) => {
      if (e.target === menuTambahData) window.closeMenu();
    });

    // Collaborator Menu Modal
    const btnCollaborator = document.getElementById('btnCollaborator');
    const menuCollaborator = document.getElementById('menuCollaborator');

    if (btnCollaborator) btnCollaborator.addEventListener('click', () => {
      menuCollaborator.classList.add('show');
      displayCollaborators();
    });
    window.closeCollaboratorMenu = function () {
      menuCollaborator.classList.remove('show');
    };
    menuCollaborator.addEventListener('click', (e) => {
      if (e.target === menuCollaborator) window.closeCollaboratorMenu();
    });

    // Notification Menu Modal
    const menuNotification = document.getElementById('menuNotification');

    window.openNotificationMenu = function (event) {
      event.stopPropagation();
      menuNotification.classList.add('show');
    };

    window.closeNotificationMenu = function () {
      menuNotification.classList.remove('show');
    };

    // Close notification menu when clicking outside
    menuNotification.addEventListener('click', (e) => {
      if (e.target === menuNotification) {
        closeNotificationMenu();
      }
    });

    // Table Menu Modal
    const btnTable = document.getElementById('btnTable');
    const menuTable = document.getElementById('menuTable');

    if (btnTable) btnTable.addEventListener('click', () => { menuTable.classList.add('show'); });
    window.closeTableMenu = function () {
      menuTable.classList.remove('show');
    };
    menuTable.addEventListener('click', (e) => {
      if (e.target === menuTable) window.closeTableMenu();
    });

    // Export-Import Menu Modal
    const btnExportImport = document.getElementById('btnExportImport');
    const menuExportImport = document.getElementById('menuExportImport');

    if (btnExportImport) btnExportImport.addEventListener('click', () => { menuExportImport.classList.add('show'); });
    window.closeExportImportMenu = function () {
      menuExportImport.classList.remove('show');
    };
    menuExportImport.addEventListener('click', (e) => {
      if (e.target === menuExportImport) window.closeExportImportMenu();
    });

    // Request Access Menu Modal
    const requestAccessBtn = document.getElementById('requestAccessBtn');
    const requestAccessMenu = document.getElementById('requestAccessMenu');

    if (requestAccessBtn) requestAccessBtn.addEventListener('click', () => { requestAccessMenu.classList.add('show'); });
    window.closeRequestAccessMenu = function () {
      requestAccessMenu.classList.remove('show');
      document.getElementById('requestAccessForm').reset();
    };
    requestAccessMenu.addEventListener('click', (e) => {
      if (e.target === requestAccessMenu) window.closeRequestAccessMenu();
    });

    // Request Access Form Submission
    document.getElementById('requestAccessForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const tableId = document.getElementById('tableId').value.trim();

      if (!tableId) {
        alert('Please enter a table ID.');
        return;
      }

      try {
        // Check if table exists
        const tableRef = doc(db, 'tables', tableId);
        const tableSnap = await getDoc(tableRef);

        if (!tableSnap.exists()) {
          alert('Table not found. Please check the table ID and try again.');
          return;
        }

        const tableData = tableSnap.data();

        // Check if user already has access to this table
        const existingAccessQuery = query(
          collection(db, 'tableAccess'),
          where('userId', '==', currentUser.uid),
          where('tableId', '==', tableId),
          where('status', '==', 'granted')
        );
        const existingAccess = await getDocs(existingAccessQuery);

        if (!existingAccess.empty) {
          alert('You already have access to this table.');
          return;
        }

        // Check if user already owns this table
        if (tableData.userId === currentUser.uid) {
          alert('You already own this table.');
          return;
        }

        // Create access request
        await addDoc(collection(db, 'tableAccess'), {
          tableId: tableId,
          userId: currentUser.uid,
          requestedBy: currentUser.email || currentUser.displayName || 'Unknown',
          status: 'pending',
          requestedAt: serverTimestamp()
        });

        alert('Access request sent successfully! You will be able to access the table once the owner approves it.');
        closeRequestAccessMenu();

      } catch (err) {
        console.error('Error requesting access:', err);
        alert('Failed to send access request. Please try again.');
      }
    });

    // Create Table Modal
    const createTableModal = document.getElementById('createTableModal');

    window.closeCreateTableModal = function () {
      createTableModal.classList.remove('show');
      document.getElementById('newTableName').value = '';
    };
    createTableModal.addEventListener('click', (e) => {
      if (e.target === createTableModal) window.closeCreateTableModal();
    });

    // Format input jumlah with dots for readability (same behavior)
    const jumlahInput = document.getElementById('jumlah');
    if (jumlahInput) {
      jumlahInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\./g, '');
        if (value && !isNaN(value)) {
          let reversed = value.split('').reverse().join('');
          let withDotsReversed = reversed.match(/.{1,3}/g).join('.');
          let withDots = withDotsReversed.split('').reverse().join('');
          e.target.value = withDots;
        } else if (!value) {
          e.target.value = '';
        }
      });
    }

    /* -----------------------
       5) DATA LAYER (Firestore)
       ----------------------- */
    let transactionData = []; // diisi dari Firestore
    window.transactionData = transactionData; // make accessible globally
    let editingId = null;     // ketika sedang edit

    // subscribe realtime ke koleksi "transactions" untuk user tertentu dan tabel tertentu
    function subscribeTransactions(userId, tableId) {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId), where('tableId', '==', tableId), orderBy('createdAt', 'desc'));
      onSnapshot(q, (snapshot) => {
        transactionData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        window.transactionData = transactionData; // update global reference
        // Pastikan field tanggal tersimpan sebagai 'YYYY-MM-DD' saat input agar mudah parse
        displayTransactions();
        updateSummary();
        const table = tablesData.find(t => t.id === tableId);
        if (table) {
          document.getElementById('dataTransaksiHeader').textContent = `Transaction Data - ${table.name}`;
        }
      }, (err) => {
        console.error("Error onSnapshot:", err);
      });
    }

    // Check auth state
    onAuthStateChanged(auth, (user) => {
      const userInfo = document.getElementById('userInfo');
      const loadingProfile = document.getElementById('loadingProfile');
      if (user) {
        currentUser = user;
        // User logged in, display info
        document.getElementById('userName').textContent = user.displayName || 'User';
        document.getElementById('userEmail').textContent = user.email;
        if (user.photoURL) {
          document.getElementById('userPhoto').src = user.photoURL;
        } else {
          document.getElementById('userPhoto').src = 'https://via.placeholder.com/100?text=No+Photo';
        }
        userInfo.style.display = 'block';
        loadingProfile.style.display = 'none';
        // Subscribe to user's tables
        subscribeTables(user.uid);
        // Subscribe to pending access requests for tables owned by this user
        subscribePendingRequests(user.uid);
      } else {
        currentUser = null;
        // User not logged in, redirect to login
        window.location.href = 'login.html';
      }
    });

    // Logout function
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      if (!confirm('Apakah Anda yakin ingin logout?')) return;
      try {
        await signOut(auth);
        window.location.href = 'login.html';
      } catch (error) {
        console.error('Error signing out:', error);
        alert('Gagal logout. Coba lagi.');
      }
    });

    /* -----------------------
       6) HELPERS
       ----------------------- */
    function formatCurrency(num) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num || 0);
    }
    function formatInputValue(num) {
      if (num == null) return '';
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    /* -----------------------
       7) UPLOAD FILE TO STORAGE
       ----------------------- */
    // Removed uploadProofFile function as part of removing Transaction Proof feature

    /* -----------------------
       8) ADD / UPDATE TRANSACTION
       ----------------------- */
    document.getElementById('transactionForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const nama = document.getElementById('nama').value.trim();
      const jenis = document.getElementById('jenis').value;
      const jumlahRaw = document.getElementById('jumlah').value.replace(/\./g, '');
      const jumlah = Number(jumlahRaw) || 0;
      const tanggal = document.getElementById('tanggal').value; // 'YYYY-MM-DD'
      const kategori = document.getElementById('kategori').value || 'Umum';

      try {
        if (editingId) {
          // update
        const refDoc = doc(db, 'transactions', editingId);
        const payload = {
            nama, jenis, jumlah, tanggal, kategori,
            userId: currentUser.uid,
            uploader: currentUser.email || currentUser.displayName || 'Unknown',
            updatedAt: serverTimestamp()
          };
          await updateDoc(refDoc, payload);
        } else {
          // create
          await addDoc(collection(db, 'transactions'), {
            nama, jenis, jumlah, tanggal, kategori,
            userId: currentUser.uid,
            tableId: currentTable,
            uploader: currentUser.email || currentUser.displayName || 'Unknown',
            createdAt: serverTimestamp()
          });
        }

        closeMenu();
      } catch (err) {
        console.error("Error saving transaction:", err);
        alert('Gagal menyimpan transaksi. Cek console.');
      }
    });

    /* -----------------------
       9) DISPLAY / FILTER / SUMMARY
       ----------------------- */
    function displayTransactions() {
      const tbody = document.getElementById('transactionTableBody');
      const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

      // Filter transactions based on search term and current table
      const filteredData = transactionData.filter(transaction =>
        transaction.nama.toLowerCase().includes(searchTerm)
      );

      if (!filteredData || filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No transactions found</td></tr>';
        return;
      }

      let html = '';
      filteredData.forEach(transaction => {
        const formattedDate = transaction.tanggal
          ? new Date(transaction.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : (transaction.createdAt && transaction.createdAt.toDate)
            ? transaction.createdAt.toDate().toLocaleDateString('id-ID')
            : '-';
        const formattedAmount = formatCurrency(transaction.jumlah);
        const lastEdited = transaction.updatedAt || transaction.createdAt;
        const formattedLastEdited = lastEdited && lastEdited.toDate ? lastEdited.toDate().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';

        html += `
          <tr>
            <td>${formattedDate}</td>
        <td>${transaction.nama}</td>
        <td>${transaction.kategori}</td>
        <td>
          <span style="color: ${transaction.jenis === 'pemasukan' ? '#4CAF50' : '#f44336'}">
            ${transaction.jenis === 'pemasukan' ? 'Income' : 'Expense'}
          </span>
        </td>
        <td class="${transaction.jenis === 'pemasukan' ? 'income-amount' : 'expense-amount'}">
          ${formattedAmount}
        </td>
        <td>
          <div class="action-buttons">
            <button class="info-btn" onclick="showMoreInfo('${transaction.id}')" title="More Information" aria-label="More Information"></button>
            <button class="edit-btn" onclick="window.editTransaction('${transaction.id}')" title="Edit" aria-label="Edit"></button>
            <button class="delete-btn" onclick="window.deleteTransaction('${transaction.id}')" title="Delete" aria-label="Delete"></button>
          </div>
        </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    }





    function updateSummary() {
      const totalIncome = transactionData
        .filter(t => t.jenis === 'pemasukan')
        .reduce((sum, t) => sum + (t.jumlah || 0), 0);

      const totalExpense = transactionData
        .filter(t => t.jenis === 'pengeluaran')
        .reduce((sum, t) => sum + (t.jumlah || 0), 0);

      const balance = totalIncome - totalExpense;

      document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
      document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
      document.getElementById('currentBalance').textContent = formatCurrency(balance);
    }

    /* -----------------------
       10) EDIT & DELETE (memanggil Firestore)
       ----------------------- */
    window.deleteTransaction = async function (id) {
      if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (err) {
        console.error("Hapus gagal:", err);
        alert('Gagal menghapus transaksi');
      }
    };

    window.editTransaction = function (id) {
      const transaction = transactionData.find(t => t.id === id);
      if (!transaction) return;
      document.getElementById('nama').value = transaction.nama || '';
      document.getElementById('jenis').value = transaction.jenis || '';
      document.getElementById('jumlah').value = formatInputValue(transaction.jumlah || 0);
      document.getElementById('tanggal').value = transaction.tanggal || '';
      document.getElementById('kategori').value = transaction.kategori || '';
      editingId = id;
      document.getElementById('submitBtn').textContent = 'Perbarui Transaksi';
      document.getElementById('modalTitle').textContent = 'Edit Transaction Data';
      menuTambahData.classList.add('show');
    };

    /* -----------------------
       11) INISIALISASI FORM & DEFAULTS
       ----------------------- */
    displayTransactions();
    updateSummary();
    document.getElementById('tanggal').valueAsDate = new Date();

    // Initialize search input event listener
    document.getElementById('searchInput').addEventListener('input', () => {
      displayTransactions();
    });

    // Ubah tombol submit jadi punya id agar bisa diganti label saat edit
    const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
    if (submitBtn) submitBtn.id = 'submitBtn';

    // Event listeners for create table
    document.getElementById('createTableBtn').addEventListener('click', () => {
      createTableModal.classList.add('show');
    });

    document.getElementById('saveTableBtn').addEventListener('click', async () => {
      const name = document.getElementById('newTableName').value.trim();
      if (!name) {
        alert('Table name cannot be empty.');
        return;
      }
      try {
        await addDoc(collection(db, 'tables'), {
          userId: currentUser.uid,
          name,
          ownerEmail: currentUser.email,
          createdAt: serverTimestamp()
        });
        closeCreateTableModal();
      } catch (err) {
        console.error('Error creating table:', err);
        alert('Failed to create table.');
      }
    });

    // Delete Table Modal
    const deleteTableModal = document.getElementById('deleteTableModal');

window.openDeleteTableModal = function (tableId) {
  document.getElementById('deleteTableId').textContent = tableId;
  const table = tablesData.find(t => t.id === tableId);
  if (table) {
    document.getElementById('deleteTableHeader').textContent = `Tabel ${table.name}`;
    const confirmBtn = document.getElementById('confirmDeleteTableBtn');
    if (table.isOwner) {
      confirmBtn.textContent = 'Delete Table';
      confirmBtn.classList.remove('secondary');
      confirmBtn.classList.add('danger');
    } else {
      confirmBtn.textContent = 'Discard Access';
      confirmBtn.classList.remove('danger');
      confirmBtn.classList.add('secondary');
    }
  }
  deleteTableModal.classList.add('show');
};

    window.closeDeleteTableModal = function () {
      deleteTableModal.classList.remove('show');
    };

    deleteTableModal.addEventListener('click', (e) => {
      if (e.target === deleteTableModal) window.closeDeleteTableModal();
    });

document.getElementById('confirmDeleteTableBtn').addEventListener('click', async () => {
  const tableId = document.getElementById('deleteTableId').textContent;
  const table = tablesData.find(t => t.id === tableId);
  if (!table) {
    alert('Table not found.');
    closeDeleteTableModal();
    return;
  }
  if (table.isOwner) {
    // Owner: delete the table
    await deleteTable(tableId);
  } else {
    // Not owner: discard access
    try {
      await discardTableAccess(tableId);
      alert('Access to the table has been discarded.');
    } catch (err) {
      console.error('Error discarding access:', err);
      alert('Failed to discard access to the table.');
    }
  }
  closeDeleteTableModal();
});

async function discardTableAccess(tableId) {
  // Find the access document for current user and tableId
  const q = query(collection(db, 'tableAccess'),
    where('userId', '==', currentUser.uid),
    where('tableId', '==', tableId),
    where('status', '==', 'granted')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error('No access record found.');
  }
  // Update the status to 'discarded' or delete the access document
  const batch = writeBatch(db);
  snapshot.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { status: 'discarded', discardedAt: serverTimestamp() });
  });
  await batch.commit();
}

    // Export to Excel
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
      const data = transactionData.map(t => ({
        Date: t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : '',
        'Transaction Name': t.nama,
        Category: t.kategori,
        Type: t.jenis === 'pemasukan' ? 'Income' : 'Expense',
        Amount: t.jumlah
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      XLSX.writeFile(wb, 'transactions.xlsx');
    });

    // Drag and Drop functionality
    const dragDropArea = document.getElementById('dragDropArea');
    const fileInput = document.getElementById('importExcelFile');

    dragDropArea.addEventListener('click', () => {
      fileInput.click();
    });

    dragDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dragDropArea.classList.add('dragover');
    });

    dragDropArea.addEventListener('dragleave', () => {
      dragDropArea.classList.remove('dragover');
    });

    dragDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDropArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        // Optionally, trigger import immediately or show file name
        dragDropArea.querySelector('p').textContent = `File selected: ${files[0].name}`;
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        dragDropArea.querySelector('p').textContent = `File selected: ${fileInput.files[0].name}`;
      } else {
        dragDropArea.querySelector('p').textContent = 'Drag and drop your Excel file here or click to select';
      }
    });

    // Import from Excel
    document.getElementById('importExcelBtn').addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        alert('Please select an Excel file to import.');
        return;
      }
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          alert('The Excel file must have at least a header row and one data row.');
          return;
        }
        const headers = jsonData[0];
        console.log('Headers in Excel file:', headers);
        const expectedHeaders = ['Date', 'Transaction Name', 'Category', 'Type', 'Amount'];
        console.log('Expected headers:', expectedHeaders);
        const headerMap = {};
        expectedHeaders.forEach(h => {
          const idx = headers.findIndex(hh => hh && typeof hh === 'string' && hh.toLowerCase().trim() === h.toLowerCase().trim());
          if (idx !== -1) headerMap[h] = idx;
        });
        console.log('Header map:', headerMap);
        if (headerMap['Date'] === undefined || headerMap['Transaction Name'] === undefined || headerMap['Type'] === undefined || headerMap['Amount'] === undefined) {
          alert('The Excel file must contain columns: Date, Transaction Name, Type, Amount.');
          return;
        }
        const transactionsToAdd = [];
        const errors = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const dateStr = row[headerMap['Date']];
          const nama = row[headerMap['Transaction Name']];
          const kategori = row[headerMap['Category']] || 'Umum';
          const typeStr = row[headerMap['Type']];
          const amount = row[headerMap['Amount']];
          if (!nama || !typeStr || amount == null) {
            errors.push(`Row ${i + 1}: Missing required fields (Transaction Name, Type, Amount).`);
            continue;
          }
          let jenis;
          const typeLower = typeStr.toLowerCase();
          if (typeLower === 'income' || typeLower === 'pemasukan') {
            jenis = 'pemasukan';
          } else if (typeLower === 'expense' || typeLower === 'pengeluaran') {
            jenis = 'pengeluaran';
          } else {
            errors.push(`Row ${i + 1}: Invalid Type '${typeStr}'. Must be 'Income', 'Expense', 'Pemasukan', or 'Pengeluaran'.`);
            continue;
          }
          const jumlah = Number(amount);
          if (isNaN(jumlah)) {
            errors.push(`Row ${i + 1}: Invalid Amount '${amount}'. Must be a number.`);
            continue;
          }
          let tanggal;
          if (dateStr) {
            const parsed = parseDate(dateStr);
            if (!parsed) {
              errors.push(`Row ${i + 1}: Invalid Date '${dateStr}'. Expected format DD/MM/YYYY.`);
              continue;
            }
            tanggal = parsed;
          } else {
            errors.push(`Row ${i + 1}: Missing Date.`);
            continue;
          }
          transactionsToAdd.push({
            nama: nama.toString().trim(),
            kategori: kategori.toString().trim(),
            jenis,
            jumlah,
            tanggal,
            userId: currentUser.uid,
            tableId: currentTable,
            uploader: currentUser.email || currentUser.displayName || 'Unknown',
            createdAt: serverTimestamp()
          });
        }
        if (errors.length > 0) {
          alert('Import failed due to errors:\n' + errors.join('\n'));
          return;
        }
        if (transactionsToAdd.length === 0) {
          alert('No valid transactions to import.');
          return;
        }
        // Batch add
        const batch = writeBatch(db);
        transactionsToAdd.forEach(t => {
          const docRef = doc(collection(db, 'transactions'));
          batch.set(docRef, t);
        });
        await batch.commit();
        alert(`Successfully imported ${transactionsToAdd.length} transactions.`);
        fileInput.value = ''; // reset file input
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import Excel file. Please check the file format.');
      }
    });

    // Helper function to parse date in various formats
    function parseDate(dateStr) {
      if (typeof dateStr === 'number') {
        // Excel date serial number
        const date = XLSX.utils.format_cell({ t: 'n', v: dateStr, w: '' }, { dateNF: 'DD/MM/YYYY' });
        return date ? new Date(date.split('/').reverse().join('-')).toISOString().split('T')[0] : null;
      }
      const str = dateStr.toString().trim();
      // Try DD/MM/YYYY (allow day and month length 1 or 2)
      let parts = str.split('/');
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        if ((dd.length === 1 || dd.length === 2) && (mm.length === 1 || mm.length === 2) && yyyy.length === 4) {
          const date = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
      }
      // Try YYYY-MM-DD
      parts = str.split('-');
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy.length === 4 && mm.length === 2 && dd.length === 2) {
          const date = new Date(str);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
      }
      // Try MM/DD/YYYY
      parts = str.split('/');
      if (parts.length === 3) {
        const [mm, dd, yyyy] = parts;
        if (mm.length <= 2 && dd.length <= 2 && yyyy.length === 4) {
          const date = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        }
      }
      return null;
    }

    // More info modal functions
    window.showMoreInfo = function(transactionId) {
      const modal = document.getElementById('moreInfoModal');
      const transaction = transactionData.find(t => t.id === transactionId);
      if (!transaction) return;
      const lastEdited = transaction.updatedAt || transaction.createdAt;
      const formattedLastEdited = lastEdited && lastEdited.toDate ? lastEdited.toDate().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';
      const content = `
        <p><strong>Uploader:</strong> ${transaction.uploader || 'Unknown'}</p>
        <p><strong>Last Edited:</strong> ${formattedLastEdited}</p>
      `;
      const modalContent = modal.querySelector('div');
      modalContent.innerHTML = `
        <button class="close-btn" onclick="closeMoreInfoModal()">×</button>
        <h1>More Information</h1>
        ${content}
      `;
      modal.classList.add('show');
    }

    window.closeMoreInfoModal = function() {
      const modal = document.getElementById('moreInfoModal');
      modal.classList.remove('show');
    }
