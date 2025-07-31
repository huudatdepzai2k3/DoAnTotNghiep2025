async function login() {
    var a = document.getElementById("inputuser").value;
    var b = document.getElementById("inputpass").value;

    try {
        const res = await fetch(`/api/login?user=${encodeURIComponent(a)}&pass=${encodeURIComponent(b)}`);
        const data = await res.json();

        if (data.success) {
            const role = data.user.role;

            if (role === "admin") {
                document.getElementById('id01').style.display='none';
                document.getElementById('btt_Screen_4').style.display='block';
            } else {
                document.getElementById('id01').style.display='none';
            }

        } else {
            alert("Đăng nhập thất bại: " + (data.error || "Không xác định"));
        }

    } catch (error) {
        console.error(error);
        alert("Lỗi kết nối server");
    }
}

function logout() // Ctrinh login
{
    alert("Đăng xuất thành công");
    window.location.href = 'Dev_by_HuuDat2k3';
}

async function pwd_reset() {
    const phone = document.getElementById("phone").value;

    try {
        const res = await fetch(`/api/pwd-reset?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (data.success) {
            alert(data.message);
        } else {
            alert("Lỗi: " + data.error);
        }
    } catch (error) {
        console.error(error);
        alert("Không thể gửi yêu cầu khôi phục mật khẩu");
    }
}

async function create_account() {
    const new_user = document.getElementById("new_name").value;
    const new_pass = document.getElementById("new_password").value;
    const new_phone = document.getElementById("new_phone").value;
    const new_role_acc = "user";

    if (!new_user || !new_pass || !new_phone) {
        return alert("Vui lòng điền đầy đủ thông tin");
    }

    try {
        const res = await fetch("/api/create-account", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: new_user,
                password: new_pass,
                phone: new_phone,
                role: new_role_acc
            })
        });

        const data = await res.json();
        if (data.success) {
            alert("Tạo tài khoản thành công");
        } else {
            alert("Lỗi: " + data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Không thể tạo tài khoản");
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

      // Tạo thẻ <td> cho password có thể chỉnh sửa
      const passwordCell = document.createElement("td");
      passwordCell.textContent = user.password;
      passwordCell.style.cursor = "pointer";
      passwordCell.addEventListener("click", () => makeEditable(passwordCell, user.username));

      row.innerHTML = `
        <td>${user.username}</td>
        <td>${user.phone_number}</td>
      `;
      row.appendChild(passwordCell);

      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
  }
}

function makeEditable(cell, username) {
  const oldPassword = cell.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = oldPassword;
  input.style.width = "100%";

  // Khi nhấn Enter hoặc click ra ngoài -> cập nhật
  input.addEventListener("blur", () => updatePassword(cell, input.value, username));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur(); // giả lập blur
  });

  cell.innerHTML = "";
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

    // Cập nhật thành công
    cell.textContent = newPassword;
    cell.style.cursor = "pointer";
    cell.addEventListener("click", () => makeEditable(cell, username));
  } catch (err) {
    console.error("❌ Lỗi cập nhật mật khẩu:", err.message);
    alert("Cập nhật mật khẩu thất bại!");
    cell.textContent = "❌";
  }
}

