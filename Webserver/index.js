////////////////////// CÁC MODULE //////////////////////
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mysql = require("mysql");
const { TagBuilder, IotGateway } = require("kepserverex-js");
const lodash = require("lodash");

////////////////////// KHAI BÁO EXPRESS //////////////////////
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

server.listen(3000, () => console.log("✅ Server chạy tại http://127.0.0.1:3000"));
app.get("/", (req, res) => res.render("home"));

////////////////////// KẾT NỐI MySQL //////////////////////
let sqlcon;

function initSqlConnection() {
  function connect() {
    sqlcon = mysql.createConnection({
      host: "127.0.0.1",
      user: "admin",
      password: "123456",
      database: "sql_plc",
      port: 3306,
      charset: "utf8mb4",
      timezone: '+07:00'
    });

    sqlcon.connect(err => {
      if (err) {
        console.log("❌ MySQL lỗi, thử lại sau 2s");
        setTimeout(connect, 2000);
      } else {
        console.log("✅ MySQL đã kết nối");
      }
    });

    sqlcon.on("error", err => {
      if (err.code === "PROTOCOL_CONNECTION_LOST") connect();
      else throw err;
    });
  }
  connect();
}

initSqlConnection();

////////////////////// KẾT NỐI KEPWARE //////////////////////
const tagBuilder = new TagBuilder({ namespace: "Channel1.Device1" });
const iotGateway = new IotGateway({ host: "127.0.0.1", port: 5000 });

const tags = [
  "sql_insert_Trigger", "state_emergency_stop", "state_auto", "state_motor",
  "state_sensor_1", "state_sensor_2", "state_sensor_3", "state_sensor_4",
  "state_sensor_5", "state_sensor_detech",
  "state_cylinder_1", "state_cylinder_2", "state_cylinder_3", "state_cylinder_4", "state_cylinder_5",
  "cylinder1_tripped", "cylinder2_tripped", "cylinder3_tripped", "cylinder4_tripped", "cylinder5_tripped",
  "motor_tripped"
];

const TagList = tags.reduce((tb, tag) => tb.read(tag), tagBuilder).get();
let tagArr = [];

function fn_tagRead() {
  return iotGateway.read(TagList).then(data => {
    tagArr = lodash.map(data, item => item.v);
  });
}

////////////////////// KẾT NỐI TWILIO //////////////////////
require('dotenv').config();
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Format số điện thoại Việt Nam về dạng +84
 * @param {string} phone
 * @returns {string}
 */
function formatPhoneNumberVN(phone) {
  if (phone.startsWith('0')) {
    return '+84' + phone.slice(1);
  }
  return phone;
}

/**
 * Gửi SMS qua Twilio
 * @param {string} to 
 * @param {string} body
 */
async function sendSMS(to, body) {
  const formattedTo = formatPhoneNumberVN(to);

  const msgOptions = {
    from: process.env.TWILIO_FROM_NUMBER,
    to: formattedTo,
    body
  };

  try {
    const message = await client.messages.create(msgOptions);
    console.log("✅ Đã gửi SMS chứa mã OTP:", message.sid);
    return message;
  } catch (err) {
    console.error("❌ Lỗi gửi SMS:", err);
    throw err;
  }
}

////////////////////// ĐỌC PLC ĐỊNH KỲ //////////////////////
let last_trigger = false;

setInterval(() => {
    fn_tagRead().then(() => {
        fn_sql_insert();
        fn_Alarm_Manage();
    });
}, 1000);

var values_old = [];

// Hàm so sánh 2 mảng theo giá trị
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Hàm ghi dữ liệu vào MySQL nếu trạng thái mới khác trạng thái cũ
function fn_sql_insert() {
  const tzoffset = new Date().getTimezoneOffset() * 60000;
  const timeNow = new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace("T", " ");

  const values = [
    tagArr[1], tagArr[2], tagArr[3], tagArr[4], tagArr[5],
    tagArr[6], tagArr[7], tagArr[8], tagArr[9], tagArr[10],
    tagArr[11], tagArr[12], tagArr[13], tagArr[14]
  ];

  if (!arraysEqual(values, values_old)) {
    const sql = `
      INSERT INTO plc_data (
        date_time, data_run, data_auto, data_motor,
        data_sensor_1, data_sensor_2, data_sensor_3, data_sensor_4, data_sensor_5, data_sensor_detech,
        data_cylinder_1, data_cylinder_2, data_cylinder_3, data_cylinder_4, data_cylinder_5
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const fullValues = [timeNow, ...values];
    values_old = [...values];

    sqlcon.query(sql, fullValues, err => {
      if (err) {
        console.error("❌ SQL INSERT error:", err);
      } else {
        console.log("✅ SQL ghi dữ liệu trạng thái mới thành công");
      }
    });
  }
}

// /////////////////////////////// GHI CẢNH BÁO VÀO DATABASE ///////////////////////////////
function fn_sql_alarm_insert(ID, AlarmName) {
  const checkSql = "SELECT * FROM alarm WHERE ID = ? AND Status = 'I'";
  sqlcon.query(checkSql, [ID], (err, result) => {
    if (err) {
      console.error("❌ Lỗi kiểm tra alarm:", err.message);
      io.emit("log", { type: "error", message: `❌ Kiểm tra alarm lỗi: ${err.message}` });
      return;
    }

    // Nếu alarm đã tồn tại và chưa xác nhận thì không ghi tiếp
    if (result.length > 0) return;

    const sql = "INSERT INTO alarm (date_time, ID, Status, AlarmName) VALUES (?, ?, ?, ?)";
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const timeNow = new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace("T", " ");
    const values = [timeNow, ID, 'I', AlarmName];

    sqlcon.query(sql, values, (err) => {
      if (err) {
        console.error("❌ Lỗi ghi alarm:", err.message);
        io.emit("log", { type: "error", message: `❌ Ghi alarm lỗi: ${err.message}` });
      } else {
        io.emit("log", { type: "info", message: `🆘 Ghi cảnh báo mới: ID ${ID} - ${AlarmName}` });
      }
    });
  });
}

// /////////////////////////////// XÁC NHẬN HẾT CẢNH BÁO ///////////////////////////////
// Hàm tự động xác nhận cảnh báo
function fn_sql_alarm_ack(ID){
  sqlcon.query("UPDATE alarm SET Status = 'IO' WHERE ID = ? AND Status = 'I'", [ID], function (err, result) {
    if (err) {
      console.error("❌ Lỗi cập nhật trạng thái alarm:", err.message);
    } else {
      console.log(`✅ Đã cập nhật trạng thái ID ${ID} thành 'IO'. Affected rows: ${result.affectedRows}`);
    }
  });
}
// /////////////////////////// TRẠNG THÁI CẢNH BÁO TRƯỚC ĐÓ ///////////////////////////
const alarmStates = [
  { id: 1, name: "xi lanh 1 sự cố", prev: false },
  { id: 2, name: "xi lanh 2 sự cố", prev: false },
  { id: 3, name: "xi lanh 3 sự cố", prev: false },
  { id: 4, name: "xi lanh 4 sự cố", prev: false },
  { id: 5, name: "xi lanh 5 sự cố", prev: false },
  { id: 6, name: "động cơ băng tải sự cố", prev: false }, 
];

// /////////////////////////// HÀM QUẢN LÝ CẢNH BÁO TOÀN HỆ THỐNG ///////////////////////////
function fn_Alarm_Manage() {
  const tagalarmData = {
    cylinder1_tripped : tagArr[15],
    cylinder2_tripped : tagArr[16],
    cylinder3_tripped : tagArr[17],
    cylinder4_tripped : tagArr[18],
    cylinder5_tripped : tagArr[19],
    motor_tripped     : tagArr[20],
  };

  const tagValues = Object.values(tagalarmData);

  alarmStates.forEach((alarm, index) => {
    const current = tagValues[index] ?? false;

    // Kiểm tra thay đổi trạng thái
    if (current !== alarm.prev) {
      if (current === true) {
        fn_sql_alarm_insert(alarm.id, alarm.name);
      } else {
        fn_sql_alarm_ack(alarm.id);
      }

      // Cập nhật trạng thái hiện tại
      alarm.prev = current;
    }
  });
}

////////////////////// SOCKET.IO //////////////////////

function fn_tag() {
  const tagData = {
    emergency_stop: tagArr[1],
    auto: tagArr[2],
    motor: tagArr[3],
    sensor_1: tagArr[4],
    sensor_2: tagArr[5],
    sensor_3: tagArr[6],
    sensor_4: tagArr[7],
    sensor_5: tagArr[8],
    sensor_detech: tagArr[9],
    cylinder_1: tagArr[10],
    cylinder_2: tagArr[11],
    cylinder_3: tagArr[12],
    cylinder_4: tagArr[13],
    cylinder_5: tagArr[14]
  };

  io.sockets.emit("tag_data", tagData);
}

io.on("connection", (socket) => {
  console.log("🟢 Client đã kết nối");

  // Gửi dữ liệu tag khi client yêu cầu
  socket.on("Client-send-data", () => {
    fn_tag();
  });

  // Xử lý sự kiện từ client và toggle trực tiếp
  socket.on("Client-send-cmd-toggle", async (tag) => {

    try {
      const currentValue = tagData[tag];
      const newValue = currentValue ? 0 : 1; // toggle 0 ↔ 1

      // Ghi giá trị mới lên KepServer
      tagBuilder.clean();
      const set_value = tagBuilder.write(tag, newValue).get();
      await iotGateway.write(set_value);

      // Cập nhật trạng thái local
      tagArr[index] = newValue;

      console.log(`✅ Toggle tag "${tag}" thành công. Giá trị mới: ${newValue}`);
      io.emit("log", { type: "success", message: `✅ Toggle tag ${tag} thành công` });
    } catch (error) {
      console.error(`❌ Lỗi toggle tag "${tag}":`, error);
      io.emit("log", { type: "error", message: `❌ Lỗi toggle tag ${tag}` });
    }
  });

  socket.on("msg_Alarm_Show", function () {
    const query = "SELECT * FROM alarm WHERE Status = 'I';";
    sqlcon.query(query, function (err, results) {
      if (err) {
        console.error("❌ Lỗi truy vấn alarm:", err.message);
        socket.emit("log", { type: "error", message: "Lỗi truy vấn alarm từ CSDL." });
      } else {
        const alarms = results.map(row => ({ ...row }));
        socket.emit("Alarm_Show", alarms);
      }
    });
  });


  // Tìm kiếm alarm theo khoảng thời gian 
  socket.on("msg_Alarm_ByTime", (data) => {
    try {
      const [startTimeRaw, endTimeRaw] = data;
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;

      const timeS = new Date(new Date(startTimeRaw) - tzoffset);
      const timeE = new Date(new Date(endTimeRaw) - tzoffset);

      const timeSStr = timeS.toISOString().slice(0, 19).replace("T", " ");
      const timeEStr = timeE.toISOString().slice(0, 19).replace("T", " ");

      const query = `SELECT * FROM alarm WHERE date_time BETWEEN ? AND ? ORDER BY date_time DESC`;

      sqlcon.query(query, [timeSStr, timeEStr], (err, results) => {
        if (err) {
            console.error("❌ Lỗi truy vấn theo thời gian:", err);
            return;
        }

        socket.emit("Alarm_ByTime", results.map(row => ({ ...row })));
      });
    } catch (error) {
      console.error("❌ Lỗi xử lý thời gian:", error);
    }
  });

  // Log khi client ngắt kết nối
  socket.on("disconnect", () => {
      console.log("🔴 Client đã ngắt kết nối");
  });
});

////////////////////// API //////////////////////
app.use(express.json());
// Đăng nhập người dùng qua username hoặc phone
app.get("/api/login", (req, res) => {
  const { user, pass } = req.query;
  if (!user || !pass) {
    return res.status(400).json({ error: "Thiếu thông tin đăng nhập" });
  }

  const sql = `
    SELECT username, phone_number, role 
    FROM users 
    WHERE (username = ? OR phone_number = ?) AND password = ?
    LIMIT 1
  `;

  sqlcon.query(sql, [user, user, pass], (err, results) => {
    if (err) {
      console.error("❌ Lỗi truy vấn đăng nhập:", err);
      return res.status(500).json({ error: "Lỗi máy chủ" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu" });
    }

    res.json({ success: true, user: results[0] });
  });
});


const fs = require("fs");
const request = require("request");

// API quên mật khẩu
app.post('/api/send-otp-forget', async (req, res) => {
  const { phone_number } = req.body;
  console.log("POST /api/send-otp-forget body:", req.body);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60000); // 5 phút

  const checkPhoneSQL = `SELECT id FROM users WHERE phone_number = ?`;

  sqlcon.query(checkPhoneSQL, [phone_number], async (err2, result2) => {
    if (err2) {
      console.error("❌ Lỗi truy vấn:", err2);
      return res.status(500).json({ error: "Lỗi truy vấn số điện thoại" });
    }

    if (result2.length === 0) {
      // ❗Không tìm thấy số điện thoại
      return res.status(404).json({ message: "❌ Số điện thoại không tồn tại" });
    }

    try {
      // Gửi OTP và lưu vào DB
      await sqlcon.query(
        "INSERT INTO otp_codes (otp_code, phone_number, created_at, expires_at) VALUES (?, ?, ?, ?)",
        [otp, phone_number, now, expires]
      );
      
      await sendSMS(phone_number, `Mã OTP đặt lại mật khẩu của bạn là: ${otp} . Lưu ý mã chỉ có tồn tại trong 5 phút`);
      console.log(`✅ Gửi OTP ${otp} đến ${phone_number}`);
      res.json({ message: "✅ Mã OTP đã được gửi!" });

    } catch (err) {
      console.error("❌ Lỗi khi gửi OTP:", err);
      res.status(500).json({ message: "❌ Lỗi server khi gửi OTP" });
    }
  });
});

app.post('/api/verify-otp-forget', (req, res) => {
  const { phone_number, password, otp } = req.body;

  if (!phone_number || !otp || !password) {
    return res.status(400).json({ message: '❗Thiếu thông tin xác minh hoặc mật khẩu' });
  }

  const otpSql = `
    SELECT * FROM otp_codes 
    WHERE phone_number = ? AND otp_code = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  sqlcon.query(otpSql, [phone_number, otp], (err, rows) => {
    if (err) {
      console.error("❌ Lỗi khi truy vấn OTP:", err);
      return res.status(500).json({ message: '❌ Lỗi server khi xác minh OTP', success: false });
    }

    if (!rows.length) {
      return res.status(400).json({ message: '❌ Mã OTP không hợp lệ', success: false });
    }

    const record = rows[0];
    const now = new Date();

    if (now > record.expires_at) {
      return res.status(400).json({ message: '❌ Mã OTP đã hết hạn', success: false });
    }

    // Cập nhật mật khẩu (dạng plain text)
    const updateSql = `UPDATE users SET password = ? WHERE phone_number = ?`;

    sqlcon.query(updateSql, [password, phone_number], (err2, result) => {
      if (err2) {
        console.error("❌ Lỗi khi cập nhật mật khẩu:", err2);
        return res.status(500).json({ message: '❌ Không thể cập nhật mật khẩu', success: false });
      }

      console.log(`✅ Mật khẩu đã được cập nhật cho ${phone_number}`);

      // Xoá OTP sau khi dùng xong
      sqlcon.query(`DELETE FROM otp_codes WHERE phone_number = ?`, [phone_number]);

      return res.json({ message: '✅ Mật khẩu đã được cập nhật thành công!', success: true });
    });
  });
});


// api đổi mật khẩu
app.post('/api/change-password', (req, res) => {
  const { username, oldPass, newPass } = req.body;
  if (!username || !oldPass || !newPass) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
  }

  const checkUser = 'SELECT password FROM users WHERE username = ?';
  sqlcon.query(checkUser, [username], (err, results) => {
    const currentPass = results[0].password;
    if (currentPass !== oldPass) {
      return res.status(401).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    }

    const updatePass = 'UPDATE users SET password = ? WHERE username = ?';
    sqlcon.query(updatePass, [newPass, username], (err2) => {
      if (err2) {
        console.error('❌ Lỗi cập nhật mật khẩu:', err2);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật mật khẩu' });
      }

      return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    });
  });
});

                      // Tạo tài khoản
// gửi otp
app.post('/api/send-otp', async (req, res) => {
  const { username, phone_number } = req.body;
  console.log("POST /api/send-otp body:", req.body);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expires = new Date(now.getTime() + 5 * 60000);

  const checkUsernameSQL = `SELECT id FROM users WHERE username = ?`;
  const checkPhoneSQL = `SELECT id FROM users WHERE phone_number = ?`;

  // Kiểm tra username trùng
  sqlcon.query(checkUsernameSQL, [username], (err1, result1) => {
    if (err1) return res.status(500).json({ error: "Lỗi truy vấn username" });
    if (result1.length > 0) return res.status(409).json({ error: "❗ Username đã tồn tại" });

    // Kiểm tra phone_number trùng
    sqlcon.query(checkPhoneSQL, [phone_number], async (err2, result2) => {
      if (err2) return res.status(500).json({ error: "Lỗi truy vấn số điện thoại" });
      if (result2.length > 0) return res.status(409).json({ error: "❗ Số điện thoại đã tồn tại" });

      try {
        console.log("Insert OTP with:", username, otp, phone_number, now, expires);

        await sqlcon.query(
          "INSERT INTO otp_codes (username, otp_code, phone_number, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
          [username, otp, phone_number, now, expires]
        );

        await sendSMS(phone_number, `Mã OTP để tạo tài khoản của bạn là: ${otp} . Lưu ý mã chỉ có tồn tại trong 5 phút`);
         console.log(`✅ Gửi OTP ${otp} đến ${phone_number}`);
         res.json({ message: "✅ Mã OTP đã được gửi!" });
      } catch (err) {
        console.error("❌ Lỗi khi gửi OTP:", err);
        res.status(500).json({ message: '❌ Lỗi server khi gửi OTP' });
      }
    });
  });
});

app.post('/api/verify-otp', (req, res) => {
  const { username, phone_number, password, otp } = req.body;

  if (!username || !phone_number || !otp || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin xác minh hoặc mật khẩu' });
  }

  const otpSql = `
    SELECT * FROM otp_codes 
    WHERE username = ? AND phone_number = ? AND otp_code = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `;

  sqlcon.query(otpSql, [username, phone_number, otp], (err, rows) => {
    if (err) {
      console.error("Lỗi khi truy vấn OTP:", err);
      return res.status(500).json({ message: 'Lỗi server khi xác minh OTP', success: false });
    }

    if (!rows.length) {
      return res.status(400).json({ message: '❌ Mã OTP không hợp lệ', success: false });
    }

    const record = rows[0];
    const now = new Date();

    if (now > record.expires_at) {
      return res.status(400).json({ message: '❌ Mã OTP đã hết hạn', success: false });
    }

    // OTP hợp lệ → tiếp tục tạo tài khoản
    const insertUserSql = `
      INSERT INTO users (username, password, phone_number, role)
      VALUES (?, ?, ?, 'user')
    `;

    sqlcon.query(insertUserSql, [username, password, phone_number], (err2) => {
      if (err2) {
        console.error("Lỗi khi tạo tài khoản:", err2);
        return res.status(500).json({ message: '❌ Lỗi khi tạo tài khoản', success: false });
      }
       sqlcon.query(`DELETE FROM otp_codes WHERE phone_number = ?`, [phone_number]);
      return res.json({ message: '✅ Xác minh OTP và tạo tài khoản thành công', success: true });
    });
  });
});

// load user 
app.get("/api/users", (req, res) => {
  const sql = "SELECT username, phone_number, password FROM users WHERE role = 'user'";
  sqlcon.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Lỗi lấy danh sách người dùng:", err.message);
      return res.status(500).json({ error: "Lỗi server", details: err.message });
    }

    if (!Array.isArray(results)) {
      console.error("❌ Dữ liệu không phải mảng:", results);
      return res.status(500).json({ error: "Dữ liệu không hợp lệ" });
    }

    console.log("📦 Danh sách trả về:", results);
    res.json(results);
  });
});

// API cập nhật mật khẩu
app.put('/api/update-password', (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Không có dữ liệu gửi lên" });
  }

  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: "Thiếu username hoặc mật khẩu mới" });
  }

  const sql = "UPDATE users SET password = ? WHERE username = ?";
  sqlcon.query(sql, [newPassword, username], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi máy chủ" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({ message: "Cập nhật mật khẩu thành công" });
  });
});

// Route delete user
app.delete("/api/delete-user", (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: "Thiếu username" });
  }
  const sql = "DELETE FROM users WHERE username = ?";
  sqlcon.query(sql, [username], (err, result) => {
    if (err) {
      console.error("❌ SQL Error:", err);
      return res.status(500).json({ error: "Lỗi truy vấn CSDL" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy user" });
    }

    res.json({ success: true, message: `Đã xóa user: ${username}` });
  });
});

// check_qr
app.get("/api/search", (req, res) => {
    const qr = req.query.qr;
    if (!qr) return res.status(400).json({ error: "Thiếu mã QR" });

    const query = `
      SELECT DATE_FORMAT(CONVERT_TZ(sorted_time, '+00:00', '+00:00'), '%H:%i:%s %d/%m/%Y') AS sorted_time,
      qr_code,address,tinhtrang FROM qr_sorted_log WHERE qr_code = ? ORDER BY sorted_time DESC LIMIT 1
    `;

    sqlcon.query(query, [qr], (err, results) => {
      if (err) return res.status(500).json({ error: "Lỗi truy vấn SQL" });
      if (results.length === 0) return res.json({ found: false });
      res.json({ found: true, data: results[0] });
    });
});


app.get("/api/sorted-table", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "Thiếu from/to" });

  const query = `
    SELECT qr_code, address, sorted_time, tinhtrang 
    FROM qr_sorted_log 
    WHERE sorted_time BETWEEN ? AND ?
    ORDER BY sorted_time ASC
  `;

  sqlcon.query(query, [from, to], (err, results) => {
    if (err) {
      console.error("❌ Lỗi truy vấn SQL:", err);
      return res.status(500).json({ error: err.message }); 
    }

    res.json(results);
  });
});;

const ExcelJS = require('exceljs');
const path = require('path');

app.get('/export-excel', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).send("❌ Thiếu 'from' hoặc 'to'");

  const query = `
    SELECT qr_code, address, sorted_time, tinhtrang 
    FROM qr_sorted_log 
    WHERE sorted_time BETWEEN ? AND ?
    ORDER BY sorted_time ASC
  `;

  sqlcon.query(query, [from, to], async (err, results) => {
    if (err) {
      console.error("❌ Lỗi truy vấn:", err);
      return res.status(500).send("Lỗi khi export Excel");
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Báo cáo phân loại", {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
        properties: { tabColor: { argb: 'FFC0000' } },
      });

      worksheet.properties.defaultRowHeight = 20;
      worksheet.pageSetup.margins = {
        left: 0.3, right: 0.25, top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3,
      };

      const logoPath = path.join(__dirname, 'public', 'images', './logo/logo.jpg');
      const imageId = workbook.addImage({
        filename: logoPath,
        extension: 'png',
      });
      worksheet.addImage(imageId, 'A1:A3');

      worksheet.getCell('D1').value = 'Trường Đại học Mỏ - Địa Chất';
      worksheet.getCell('D1').style = {
        font: { name: 'Times New Roman', bold: true, size: 14 },
        alignment: {vertical: 'middle' },
      };
      worksheet.getCell('D2').value = 'Địa chỉ: 18 Phố Viên, Đông Ngạc, Bắc Từ Liêm, Hà Nội';
      worksheet.getCell('D3').value = 'Hotline: 024 3838 9633';

      // Tên báo cáo
      worksheet.mergeCells('A5:E5');
      worksheet.getCell('A5').value = 'BÁO CÁO PHÂN LOẠI SẢN PHẨM';
      worksheet.getCell('A5').style = {
        font: { name: 'Times New Roman', bold: true, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' },
      };

      // Ngày giờ in báo cáo
      const now = new Date();
      const formattedTime = now.toLocaleString("vi-VN", {
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      });
      worksheet.getCell('E6').value = "Ngày in: " + formattedTime;
      worksheet.getCell('E6').alignment = { horizontal: 'right' };
      worksheet.getCell('E6').font = { italic: true };

      // Header bảng dữ liệu
      const headerRow = ["STT", "Mã QR", "Vị trí", "Thời gian phân loại", "Trạng thái"];
      worksheet.addRow(headerRow);

      const header = worksheet.getRow(7);
      header.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Thêm dữ liệu
      results.forEach((row, index) => {
        const timeFormatted = new Date(row.sorted_time).toLocaleString("vi-VN", {
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        });

        worksheet.addRow([
          index + 1,
          row.qr_code,
          row.address,
          timeFormatted,
          row.tinhtrang
        ]);
      });

      // Căn lề và border cho dữ liệu
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 7) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
          });
        }
      });

      // Đặt độ rộng cột
      worksheet.columns = [
        { key: "stt", width: 8 },
        { key: "qr_code", width: 25 },
        { key: "address", width: 30 },
        { key: "sorted_time", width: 25 },
        { key: "tinhtrang", width: 25 },
      ];

      // Header response
      res.setHeader("Content-Disposition", `attachment; filename=bao_cao_phan_loai_${from}_to_${to}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();
    } catch (excelErr) {
      console.error("❌ Lỗi khi ghi file Excel:", excelErr);
      return res.status(500).send("Lỗi khi xuất Excel");
    }
  });
});


// create chart
app.get("/api/chart-data", (req, res) => {
    const { start, end, mode } = req.query;
    const finalData = { position_counts: [], pie: [], history: [] };

    const positionTasks = Array.from({ length: 5 }, (_, i) => {
      return new Promise((resolve, reject) => {
        sqlcon.query(`SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position = ? AND DATE(sorted_time) = CURDATE()`, [i + 1], (err, result) => {
          if (err) return reject(err);
          finalData.position_counts[i + 1] = result[0].total;
          resolve();
        });
      });
    });

    const pie1 = new Promise((resolve, reject) => {
      sqlcon.query(`SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position = 6 AND DATE(sorted_time) = CURDATE()`, (err, result) => {
        if (err) return reject(err);
        finalData.pie[0] = result[0].total;
        resolve();
      });
    });

    const pie2 = new Promise((resolve, reject) => {
      sqlcon.query(`SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position BETWEEN 1 AND 5 AND DATE(sorted_time) = CURDATE()`, (err, result) => {
        if (err) return reject(err);
        finalData.pie[1] = result[0].total;
        resolve();
      });
    });

    const historicalQuery = {
      day: `SELECT DATE_FORMAT(sorted_time, '%Y-%m-%d') AS label, COUNT(*) AS total 
            FROM qr_sorted_log 
            WHERE sorted_time BETWEEN ? AND ? 
            GROUP BY label`,
      month: `SELECT DATE_FORMAT(sorted_time, '%Y-%m') AS label, COUNT(*) AS total 
              FROM qr_sorted_log 
              WHERE sorted_time BETWEEN ? AND ? 
              GROUP BY label`,
      year: `SELECT DATE_FORMAT(sorted_time, '%Y') AS label, COUNT(*) AS total 
            FROM qr_sorted_log 
            WHERE sorted_time BETWEEN ? AND ? 
            GROUP BY label`
    }[mode];

    let endDateTime;
    if (mode === 'day') {
      endDateTime = end + ' 23:59:59';
    } else {
      endDateTime = end;
    }

    const historyTask = (start && end && historicalQuery) ? new Promise((resolve, reject) => {
      sqlcon.query(historicalQuery, [start, endDateTime], (err, results) => {
        if (err) return reject(err);
        finalData.history = results;
        resolve();
      });
    }) : Promise.resolve();


    Promise.all([...positionTasks, pie1, pie2, historyTask])
      .then(() => res.json(finalData))
      .catch(err => res.status(500).json({ error: "Lỗi truy vấn dữ liệu" }));
});
