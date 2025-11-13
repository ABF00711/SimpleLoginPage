// Wait for full page load before running dashboard logic
// used to ensure grid + UI elements are ready
window.onload = async () => {

  // Track form mode (create/update) and delete target ID
  let formMode = "create";
  let deleteId = null;

  // Cache page elements
  const grid = document.querySelector('#grid');
  const win = document.getElementById("addUserWindow");
  const form = document.getElementById("addUserForm");
  const submitBtn = document.getElementById("formSubmitBtn");
  const msgWin = document.getElementById("msgWin");
  const msgText = document.getElementById("msgText");

  // Helper selector for form fields
  const f = (name) => form.querySelector(`[data-field="${name}"]`);

  // Show temporary UI message popup (success/error)
  function showMsg(text, success){
    msgText.textContent = text;
    msgText.style.color = success ? "green" : "red";
    msgWin.open();
    setTimeout(()=> msgWin.close(), 1500);
  }

  // Helper Email Validitor
  function validateEmail(email) {
    if (!email.trim()) return "Email is required";

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Enter a valid email";

    return "";
  }

  // Enable checkbox-only row selection
  grid.selection = {
    enabled: true,
    allowRowSelection: false,
    checkBoxes: {
      enabled: true,
      position: 'near',
      selectAllMode: 'all',
      action: 'click'
    }
  };

  // Convert camelCase keys to readable table headers
  const formatLabel = (key) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, m => m.toUpperCase());

  // Fetch users from backend and populate grid
  try {
    const res = await fetch('./backend/getAllUsers.php');
    const users = await res.json();
    const data = users.data || [];

    if (data.length > 0) {
      // Auto generate grid columns based on data keys
      const firstRow = data[0];
      const dynamicColumns = Object.keys(firstRow).map(key => ({
        label: formatLabel(key),     // Turn field to readable label
        dataField: key,
        dataType: typeof firstRow[key] === "number" ? "number" : "string",
        align: "center"
      }));

      // Add edit icon column
      dynamicColumns.push({
        template: (fo) => {
          const id = fo.data.id;
          const container = document.createElement("div");
          container.style.display = "flex";
          container.style.gap = "8px";

          const editBtn = document.createElement("smart-button");
          editBtn.classList.add("edit-btn");
          editBtn.setAttribute("data-id", id);
          editBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor"> <path d="M12 20h9"></path> <path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4Z"></path> </svg>`;

          container.append(editBtn);
          fo.template = container;
        }
      });

      grid.columns = dynamicColumns;
      grid.dataSource = data;
    }
  } catch {
    grid.dataSource = []; // fallback if API fails
  }

  // Open form for user creation
  document.getElementById("addNewUserBtn").addEventListener("click", () => {
    formMode = "create";
    win.label = "Create User";
    submitBtn.textContent = "Create";
    form.reset();
    f("id").value = "";
    f("firstName").value = '';
    f("lastName").value = '';
    f("username").value = '';
    f("email").value ='';
    f("address").value = '';
    win.open();
  });

  // Handle edit button click from grid
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".edit-btn");

    if (btn) {
      const id = btn.getAttribute("data-id");
      const row = grid.dataSource.find(u => u.id == id);

      formMode = "edit";
      win.label = "Edit User";
      submitBtn.textContent = "Update";

      form.reset();

      f("id").value = row.id;
      f("firstName").value = row.firstName;
      f("lastName").value = row.lastName;
      f("username").value = row.username;
      f("email").value = row.email;
      f("address").value = row.address;

      // password empty for security
      f("password").value = "";

      win.open();
    }


  });

  // Submit create/update form
  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const msgBox = form.querySelector(".msg");
    msgBox.textContent = "";
    msgBox.style.color = "";

    // Build request payload
    const data = {
      id: f("id").value,
      firstName: f("firstName").value,
      lastName: f("lastName").value,
      username: f("username").value,
      password: f("password").value,
      email: f("email").value,
      address: f("address").value
    };

    const emailErr = validateEmail(data.email);

    if(emailErr !== "") {
      msgBox.style.color = 'red'
      msgBox.textContent = emailErr;
      return;
    }

    // Choose endpoint based on mode
    const endpoint = formMode === "create"
      ? "./backend/register.php"
      : "./backend/editUserById.php";

    // Send data to backend
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });

    const out = await res.json();

    msgBox.textContent = out.message;
    msgBox.style.color = out.status === "success" ? "green" : "red";

    // Refresh after success
    if (out.status === "success") {
      setTimeout(() => {
        win.close();
        location.reload();
      }, 800);
    }
  });

  // Bulk delete selected users
  document.getElementById("bulkDeleteBtn").addEventListener("click", async () => {
    const selected = grid.getSelection();

    if (!selected.rows || selected.rows.length === 0) {
      showMsg("Select users to delete", false);
      return;
    }

    const ids = selected.rows.map(r => r.row.data.id);
    const res = await fetch("./backend/deleteUsersById.php", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ids })
    });
    const out = await res.json();
    showMsg(out.message, out.status === "success");
    if (out.status === "success") setTimeout(()=> location.reload(), 800);
  });

};
