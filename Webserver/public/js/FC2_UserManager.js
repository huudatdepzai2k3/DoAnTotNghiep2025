// Danh sách người dùng
const account = [{"name": "admin","password":"1","phone":"+8462182615212","role":"Quản trị viên"}, 
    {"name":"user1","password":"1","phone":"+846218261678","role":"Người dùng"}]

// Chương trình con
function login()
{
    var a = document.getElementById("inputuser").value;
    var b = document.getElementById("inputpass").value;
    var login_sucess = false; // Biến để xác nhận đăng nhập thành công
    for (var i = 0; i < account.length; i++) {
        if ((a == account[i].name || a == account[i].phone) && b == account[i].password) {
            if (account[i].role == "Quản trị viên") {
                document.getElementById('id01').style.display='none';
                document.getElementById('btt_Screen_4').style.display='block';
            } else if (account[i].role == "Người dùng") {
                document.getElementById('id01').style.display='none';
            }
            login_sucess = true; // Biến toàn cục để xác nhận đăng nhập thành công
        } 
    }

    if (!login_sucess) {
        alert("Tài khoản hoặc mật khẩu không đúng, vui lòng thử lại");
        return;
    }
}

function logout() // Ctrinh login
{
    alert("Đăng xuất thành công");
    window.location.href = 'Dev_by_HuuDat2k3';
}

function pwd_reset()
{
    var phone = document.getElementById("phone").value;
    var found_phone = false; // Biến để xác nhận tìm thấy số điện thoại
    for (var i = 0; i < account.length; i++) {
        if (phone == account[i].phone) {
            found_phone = true; // Biến để xác nhận tìm thấy số điện thoại
            // Chương trình con gửi SMS
            var request = require('request');
            var fs = require('fs');

            var authOptions = {
                uri: 'https://api.telecomscloud.com/v1/authorization/oauth2/grant-client',
                method: 'POST',
                json : {
                    "client_id": fs.readFileSync('client_id.txt', 'utf8'), // Thay thế bằng client_id của bạn
                    "client_secret": fs.readFileSync('client_secret.txt', 'utf8'), // Thay thế bằng client_secret của bạn
                }
            };

            request(authOptions, function(error, response, apiAuth) {
                var accessToken = apiAuth.access_token; // Lấy access token từ phản hồi

                var sendSMSoptions = {
                    uri: 'https://api.telecomscloud.com/v1/sms/outbound?access_token=' + accessToken,
                    method: 'POST',
                    json: {
                        "to": phone, // Số điện thoại người nhận
                        "from": "YourServiceName", // Tên dịch vụ của bạn
                        "message": "Đây là liên kết đặt lại mật khẩu của bạn: http://example.com/reset-password" // Thông điệp SMS
                    }
                };

                request(sendSMSoptions, function(error, response, body) {
                    if (!error && response.statusCode == 200) {
                        alert("Liên kết đặt lại mật khẩu đã được gửi đến số điện thoại của bạn");
                    } else {
                        console.error('Error sending SMS:', error);
                        alert("Gửi SMS thất bại, vui lòng thử lại sau");
                    }
                });
            });

        } 
    }

    if (!found_phone) {
        alert("Số điện thoại tài khoản không tồn tại, vui lòng thử lại");
    }

}

function create_account()
{
    var new_user = document.getElementById("new_name").value;
    var new_pass = document.getElementById("new_password").value;
    var new_phone = document.getElementById("new_phone").value;
    var new_role_acc = document.getElementById("new_role_acc").value;

    if (new_user && new_pass && new_phone) {
        alert("Tài khoản đã được tạo thành công!");
        account.push({
            "name": new_user,
            "password": new_pass,
            "phone": new_phone,
            "role": new_role_acc ? parseInt(new_role_acc) : "Người dùng" // Mặc định là user nếu không có role
        });
    } else {
        alert("Vui lòng điền đầy đủ thông tin để tạo tài khoản");
    }
}
