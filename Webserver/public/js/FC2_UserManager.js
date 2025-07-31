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
