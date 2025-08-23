async function login() {
  const username = document.getElementById("inputuser").value.trim();
  const password = document.getElementById("inputpass").value;
  const remember = document.getElementById("rememberMe").checked;

  try {
    const res = await fetch(`/api/login?user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
    const data = await res.json();

    if (data.success) {
      const role = data.user.role || "user";
      localStorage.setItem("username", data.user.username);
      console.log(`✅ Đăng nhập thành công với vai trò: ${role}`);

      // Ghi nhớ đăng nhập nếu được chọn
      if (remember) {
        localStorage.setItem("savedUsername", username);
        localStorage.setItem("savedPassword", password);
      } else {
        localStorage.removeItem("savedUsername");
        localStorage.removeItem("savedPassword");
      }

      // Ẩn khung đăng nhập, hiện màn hình theo vai trò
      document.getElementById('id01').style.display = 'none';
      document.getElementById('btnchangepass').style.display = 'block'
      if (role === "admin") {
        document.getElementById('btt_Screen_4').style.display = 'block';
      }

    } else {
      alert("❌ Đăng nhập thất bại: " + (data.error || "Sai tên đăng nhập hoặc mật khẩu"));
    }

  } catch (error) {
    console.error("❌ Lỗi kết nối server:", error);
    alert("Lỗi kết nối đến server!");
  }
}

// Tự động điền nếu đã lưu trong localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedUsername = localStorage.getItem("savedUsername");
  const savedPassword = localStorage.getItem("savedPassword");

  if (savedUsername && savedPassword) {
    document.getElementById("inputuser").value = savedUsername;
    document.getElementById("inputpass").value = savedPassword;
    document.getElementById("rememberMe").checked = true;
  }
});

function logout() // Ctrinh login
{
  alert("Đăng xuất thành công");
  window.location.href = 'Dev_by_HuuDat2k3';
}

async function changepassword() {
  event.preventDefault();
  const username = localStorage.getItem("username");  
  const oldPass = document.getElementById("oldPass").value;
  const newPass = document.getElementById("newPass").value;
  const confirmPass = document.getElementById("confirmPass").value;

  if (!oldPass || !newPass || !confirmPass) {
    alert("❗Vui lòng điền đầy đủ thông tin.");
    return;
  }

  if (newPass !== confirmPass) {
    alert("❗Mật khẩu xác nhận không khớp.");
    return;
  }

  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, oldPass, newPass })
    });

    const data = await res.json();
    if (data.success) {
      alert("✅ Đổi mật khẩu thành công.");
      setTimeout(() => {
        location.reload(); 
      }, 100);
    } else {
      alert("❌ " + data.message);
    }
  } catch (err) {
    console.error("❌ Lỗi đổi mật khẩu:", err);
    alert("❌ Đã xảy ra lỗi máy chủ.");
    return;
  }
}

async function loadUsers() {
  try {
    const res = await fetch("/api/users");
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("API không trả về danh sách (mảng)");
    }

    const tableBody = document.getElementById("userTableBody");
    if (!tableBody) {
      throw new Error("Không tìm thấy phần tử với id 'userTableBody'");
    }

    tableBody.innerHTML = "";
    data.forEach(user => {
      const row = document.createElement("tr");

      // Cột chỉnh sửa mật khẩu
      const passwordCell = document.createElement("td");
      passwordCell.textContent = user.password;
      passwordCell.style.cursor = "pointer";
      passwordCell.addEventListener("click", () => makeEditable(passwordCell, user.username));

      // Cột xóa user
      const deleteCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.border = "none";
      deleteBtn.style.background = "transparent";
      deleteBtn.style.fontSize = "1.2em";
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Bạn có chắc chắn muốn xóa user "${user.username}"?`)) {
          deleteUser(user.username);
        }
      });
      deleteCell.appendChild(deleteBtn);

      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.phone_number}</td>
      `;
      row.appendChild(passwordCell);
      row.appendChild(deleteCell);

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
}

function makeEditable(cell, username) {
  const oldPassword = cell.textContent;

  // Ngăn chỉnh sửa nếu đang trong trạng thái input
  if (cell.querySelector("input")) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = oldPassword;
  input.style.width = "100%";
  input.style.boxSizing = "border-box";

  input.addEventListener("blur", () => updatePassword(cell, input.value, username));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });

  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
}

async function updatePassword(cell, newPassword, username) {
  try {
    const res = await fetch("/api/update-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, newPassword })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Lỗi cập nhật");

    cell.textContent = newPassword;
    cell.style.cursor = "pointer";

    const newCell = cell.cloneNode(true);
    newCell.addEventListener("click", () => makeEditable(newCell, username));
    cell.replaceWith(newCell);

    // ✅ Log cập nhật thành công
    alert(`✅ Mật khẩu của '${username}' đã được cập nhật thành công: ${newPassword}`);
  } catch (err) {
    console.error("❌ Lỗi cập nhật mật khẩu:", err.message);
    alert("Cập nhật mật khẩu thất bại!");
    cell.textContent = "❌";
  }
}

async function deleteUser(username) {
  try {
    const response = await fetch(`/api/delete-user?username=${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Lỗi không xác định");
    }
    console.log("✅ Xóa thành công:", data.message);
    alert(`🗑️ Đã xóa user: ${username}`);
    loadUsers();
  } catch (error) {
    console.error("❌ Lỗi khi xóa user:", error.message);
    alert(`❌ Xóa user thất bại: ${error.message}`);
  }
}

let countdownInterval;
async function sendOtp() {
  event.preventDefault();
  const username = document.getElementById("new_name").value;
  const phone_number = document.getElementById("new_phone").value;
  const password = document.getElementById("new_password").value;
  const sendBtn = document.getElementById("sendOtpBtn");
  const countdownEl = document.getElementById("countdown");

  if (!username || !phone_number || !password) {
    return alert("❗ Vui lòng điền đầy đủ thông tin");
  }

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, phone_number })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      // ✅ Nếu gửi thành công → đếm ngược
      startCountdown(60, sendBtn, countdownEl);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Lỗi khi gửi mã OTP. Vui lòng thử lại sau.");
  }
}

async function sendOtp_forget() {
  event.preventDefault();
  const phone_number = document.getElementById("phone_forget").value;
  const password = document.getElementById("new_password_foget").value;
  const sendBtn = document.getElementById("sendOtpBtn_foget");
  const countdownEl = document.getElementById("countdown_forget");

  if (!phone_number || !password) {
    return alert("❗ Vui lòng điền đầy đủ thông tin");
  }

  try {
    const res = await fetch('/api/send-otp-forget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({phone_number })
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      startCountdown(60, sendBtn, countdownEl);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Lỗi khi gửi mã OTP. Vui lòng thử lại sau.");
  }
}

function startCountdown(seconds, button, display) {
  button.disabled = true;
  let remaining = seconds;

  display.textContent = `Vui lòng đợi ${remaining}s`;
  countdownInterval = setInterval(() => {
    remaining--;
    display.textContent = `Vui lòng đợi ${remaining}s`;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      button.disabled = false;
      display.textContent = ""; 
    }
  }, 1000);
}


async function verifyOtp() {
  event.preventDefault();
  const username = document.getElementById("new_name").value;
  const phone_number = document.getElementById("new_phone").value;
  const password = document.getElementById("new_password").value;
  const otp = document.getElementById("otpInput").value;

  if (!username || !phone_number || !password || !otp) {
    return alert("❗ Vui lòng nhập đầy đủ thông tin và mã OTP");
  }

  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, phone_number,password, otp })
    });

    const data = await res.json();
    alert(data.message);
    if (data.success) {
      setTimeout(() => {
        location.reload(); 
      }, 100);  
    }
  } catch (err) {
    console.error(err);
    alert("❌ Lỗi xác minh OTP. Vui lòng thử lại.");
  }
}

async function verifyOtp_forget() {
  event.preventDefault();
  const phone_number = document.getElementById("phone_forget").value;
  const password = document.getElementById("new_password_foget").value;
  const otp = document.getElementById("otpInput_forget").value;

  if (!phone_number || !password || !otp) {
    return alert("❗ Vui lòng nhập đầy đủ thông tin và mã OTP");
  }

  try {
    const res = await fetch('/api/verify-otp-forget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({phone_number,password, otp })
    });

    const data = await res.json();
    alert(data.message);
    if (data.success) {
      setTimeout(() => {
        location.reload(); 
      }, 100);  
    }
  } catch (err) {
    console.error(err);
    alert("❌ Lỗi xác minh OTP. Vui lòng thử lại.");
  }
}





