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

server.listen(3000, () => console.log("✅ Server chạy tại http://localhost:3000"));
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
            charset: "utf8mb4"
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
    "sql_insert_Trigger", "state_run", "state_auto", "state_motor",
    "state_sensor_1", "state_sensor_2", "state_sensor_3", "state_sensor_4",
    "state_sensor_5", "state_sensor_detech",
    "state_cylinder_1", "state_cylinder_2", "state_cylinder_3", "state_cylinder_4", "state_cylinder_5","cylinder1_tripped","cylinder2_tripped",
    "cylinder3_tripped","cylinder4_tripped","cylinder5_tripped","motor_tripped"
];

const TagList = tags.reduce((tb, tag) => tb.read(tag), tagBuilder).get();
let tagArr = [];

function fn_tagRead() {
    return iotGateway.read(TagList).then(data => {
        tagArr = lodash.map(data, item => item.v);
    });
}

function fn_Data_Write(tag, data) {
    tagBuilder.clean();
    const payload = tagBuilder.write(tag, data).get();
    iotGateway.write(payload);
}

////////////////////// ĐỌC PLC ĐỊNH KỲ //////////////////////
let last_trigger = false;

setInterval(() => {
    fn_tagRead().then(() => {
        const trigger = tagArr[0];
        if (trigger === true && !last_trigger) {
            fn_sql_insert();
            fn_sql_alarm_insert();
            fn_Alarm_Manage();
        }
        last_trigger = trigger;
    });
}, 1000);

function fn_sql_insert() {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const timeNow = new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace("T", " ");
    const values = [
        timeNow,
        tagArr[2], tagArr[3], tagArr[4], tagArr[5], tagArr[6],
        tagArr[7], tagArr[8], tagArr[9], tagArr[10], tagArr[11],
        tagArr[12], tagArr[13], tagArr[14]
    ];
    const sql = `INSERT INTO plc_data (date_time, data_auto, data_motor, data_sensor_1, data_sensor_2, data_sensor_3, data_sensor_4, data_sensor_5, data_sensor_detech, data_cylinder_1, data_cylinder_2, data_cylinder_3, data_cylinder_4, data_cylinder_5)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    sqlcon.query(sql, values, err => {
        if (err) console.log("❌ SQL INSERT error:", err);
        else console.log("✅ SQL ghi dữ liệu thành công");
    });
}

// /////////////////////////////// CẢNH BÁO ///////////////////////////////
/////////////////////// GỬI TRẠNG THÁI ALARM QUA SOCKET ///////////////////////
function fn_tag() {
    io.sockets.emit("cylinder1_tripped", tagArr[0]);
    io.sockets.emit("cylinder2_tripped", tagArr[1]);
    io.sockets.emit("cylinder3_tripped", tagArr[2]);
    io.sockets.emit("cylinder4_tripped", tagArr[3]);
    io.sockets.emit("cylinder5_tripped", tagArr[4]);
    io.sockets.emit("motor_tripped", tagArr[5]);
}

/////////////////////// THÊM CẢNH BÁO MỚI VÀO SQL ///////////////////////
function fn_sql_alarm_insert(ID, AlarmName) {
    const sql = "INSERT INTO alarm (date_time, ID, Status, AlarmName) VALUES (?, ?, ?, ?)";

    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const timeNow = new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace("T", " ");

    const values = [timeNow, ID, 'I', AlarmName];

    sqlcon.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Lỗi ghi alarm:", err.message);
            io.emit("log", { type: "error", message: `❌ Ghi alarm lỗi: ${err.message}` });
        } else {
            io.emit("log", { type: "info", message: `🆘 Ghi cảnh báo mới: ID ${ID} - ${AlarmName}` });
        }
    });
}

/////////////////////// XÁC NHẬN HẾT CẢNH BÁO ///////////////////////
function fn_sql_alarm_ack(ID) {
    const sql = "UPDATE alarm SET Status = 'IO' WHERE ID = ?";
    sqlcon.query(sql, [ID], (err, result) => {
        if (err) {
            console.error("❌ Lỗi xác nhận alarm:", err.message);
            io.emit("log", { type: "error", message: `❌ Xác nhận alarm lỗi: ${err.message}` });
        } else {
            io.emit("log", { type: "info", message: `✅ Xác nhận cảnh báo kết thúc: ID ${ID}` });
        }
    });
}

/////////////////////// TRẠNG THÁI CẢNH BÁO TRƯỚC ĐÓ ///////////////////////
const alarmStates = [
    { id: 1, name: "xi lanh 1 sự cố", prev: false },
    { id: 2, name: "xi lanh 2 sự cố", prev: false },
    { id: 3, name: "xi lanh 3 sự cố", prev: false },
    { id: 4, name: "xi lanh 4 sự cố", prev: false },
    { id: 5, name: "xi lanh 5 sự cố", prev: false },
    { id: 6, name: "động cơ băng tải sự cố", prev: false }, 
];

/////////////////////// HÀM QUẢN LÝ CẢNH BÁO ///////////////////////
function fn_Alarm_Manage() {
    for (let i = 0; i < alarmStates.length; i++) {
        const current = tagArr[i] ?? false; 
        const alarm = alarmStates[i];

        if (current !== alarm.prev) {
            if (current === true) {
                fn_sql_alarm_insert(alarm.id, alarm.name);
            } else {
                fn_sql_alarm_ack(alarm.id);
            }

            alarm.prev = current; 
        }
    }
}


////////////////////// SOCKET.IO //////////////////////
io.on("connection", socket => {
    console.log("🟢 Client đã kết nối");

    socket.on("Client-send-cmdM1", () => {
        const button_state = "state_button";
        const value = tagArr.includes(0) ? 1 : 0;
        fn_Data_Write(button_state, value);
    });

    socket.on("msg_Alarm_Show", () => {
        const sql = "SELECT * FROM alarm WHERE Status = 'I'";
        sqlcon.query(sql, (err, results) => {
            if (err) return console.log(err);
            socket.emit("Alarm_Show", results.map(r => ({ ...r })));
        });
    });
});

////////////////////// API //////////////////////

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
app.get("/api/pwd-reset", (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Thiếu số điện thoại" });

    const sql = `SELECT * FROM users WHERE phone_number = ? LIMIT 1`;
    sqlcon.query(sql, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: "Lỗi truy vấn SQL" });
        if (results.length === 0) return res.status(404).json({ error: "Không tìm thấy số điện thoại" });

        // Gửi SMS reset password
        const client_id = fs.readFileSync("client_id.txt", "utf8").trim();
        const client_secret = fs.readFileSync("client_secret.txt", "utf8").trim();

        const authOptions = {
            uri: "https://api.telecomscloud.com/v1/authorization/oauth2/grant-client",
            method: "POST",
            json: { client_id, client_secret }
        };

        request(authOptions, (error, response, apiAuth) => {
            if (error || !apiAuth.access_token) return res.status(500).json({ error: "Không xác thực được SMS API" });

            const accessToken = apiAuth.access_token;
            const sendSMSoptions = {
                uri: `https://api.telecomscloud.com/v1/sms/outbound?access_token=${accessToken}`,
                method: "POST",
                json: {
                    to: phone,
                    from: "YourServiceName",
                    message: "Đây là liên kết đặt lại mật khẩu của bạn: http://example.com/reset-password"
                }
            };

            request(sendSMSoptions, (err2, response2, body2) => {
                if (err2 || response2.statusCode !== 200) {
                    console.error("Gửi SMS thất bại:", err2);
                    return res.status(500).json({ error: "Gửi SMS thất bại" });
                }

                res.json({ success: true, message: "Đã gửi liên kết đặt lại mật khẩu qua SMS" });
            });
        });
    });
});

// api tạo tài khoản
const bcrypt = require("bcryptjs");

app.post("/api/create-account", express.json(), async (req, res) => {
    const { username, password, phone, role } = req.body;

    if (!username || !password || !phone) {
        return res.status(400).json({ error: "Thiếu thông tin" });
    }

    const checkUsernameSQL = `SELECT id FROM users WHERE username = ?`;
    const checkPhoneSQL = `SELECT id FROM users WHERE phone_number = ?`;

    // Kiểm tra username trùng
    sqlcon.query(checkUsernameSQL, [username], (err1, result1) => {
        if (err1) return res.status(500).json({ error: "Lỗi truy vấn username" });
        if (result1.length > 0) return res.status(409).json({ error: "Username đã tồn tại" });

        // Kiểm tra phone_number trùng
        sqlcon.query(checkPhoneSQL, [phone], async (err2, result2) => {
            if (err2) return res.status(500).json({ error: "Lỗi truy vấn số điện thoại" });
            if (result2.length > 0) return res.status(409).json({ error: "Số điện thoại đã tồn tại" });

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                const insertSQL = `
                    INSERT INTO users (username, password, phone_number, role)
                    VALUES (?, ?, ?, ?)
                `;
                sqlcon.query(insertSQL, [username, hashedPassword, phone, role || "user"], err3 => {
                    if (err3) return res.status(500).json({ error: "Lỗi thêm tài khoản" });
                    res.json({ success: true, message: "Tạo tài khoản thành công" });
                });
            } catch (e) {
                res.status(500).json({ error: "Lỗi xử lý mật khẩu" });
            }
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

app.put("/api/update-password", express.json(), (req, res) => {
  console.log("📥 PUT /api/update-password");
  console.log("📦 Body:", req.body);

  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: "Thiếu thông tin đầu vào" });
  }

  const sql = "UPDATE users SET password = ? WHERE username = ?";
  db.query(sql, [newPassword, username], (err, result) => {
    if (err) {
      console.error("❌ Lỗi SQL:", err.message);
      return res.status(500).json({ error: "Lỗi SQL", details: err.message });
    }

    console.log("✅ Update thành công:", result);
    res.json({ success: true });
  });
});


// check_qr
app.get("/api/search", (req, res) => {
    const qr = req.query.qr;
    if (!qr) return res.status(400).json({ error: "Thiếu mã QR" });

    const query = `SELECT sorted_time, qr_code, address, tinhtrang FROM qr_sorted_log WHERE qr_code = ? ORDER BY sorted_time DESC LIMIT 1`;
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
      return res.status(500).json({ error: err.message }); // 👈 Fix tại đây
    }

    res.json(results);
  });
});;

const ExcelJS = require("exceljs");
app.get("/export-excel", (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).send("Thiếu from hoặc to");

  const query = `
    SELECT qr_code, address, sorted_time, tinhtrang 
    FROM qr_sorted_log 
    WHERE sorted_time BETWEEN ? AND ?
    ORDER BY sorted_time ASC
  `;

  sqlcon.query(query, [from, to], async (err, results) => {
    if (err) {
      console.error("❌ Lỗi truy vấn:", err);
      return res.status(500).send("Lỗi export Excel");
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sorted Logs");

    // Định nghĩa cột
    sheet.columns = [
      { header: "Mã QR", key: "qr_code", width: 25 },
      { header: "Vị trí", key: "address", width: 30 },
      { header: "Thời gian phân loại", key: "sorted_time", width: 25 },
      { header: "Trạng thái đơn hàng", key: "tinhtrang", width: 25 },
    ];

    // Chuyển đổi thời gian sang chuỗi định dạng đẹp
    results.forEach(row => {
      const formattedTime = new Date(row.sorted_time).toLocaleString("vi-VN", {
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
      });

      sheet.addRow({
        qr_code: row.qr_code,
        address: row.address,
        sorted_time: formattedTime,
        tinhtrang: row.tinhtrang,
      });
    });

    // Header cho file xuất
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=danh_sach_phan_loai_${from}_to_${to}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
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
        day: `SELECT DATE(sorted_time) AS label, COUNT(*) AS total FROM qr_sorted_log WHERE sorted_time BETWEEN ? AND ? GROUP BY DATE(sorted_time)`,
        month: `SELECT DATE_FORMAT(sorted_time, '%Y-%m') AS label, COUNT(*) AS total FROM qr_sorted_log WHERE sorted_time BETWEEN ? AND ? GROUP BY label`,
        year: `SELECT DATE_FORMAT(sorted_time, '%Y') AS label, COUNT(*) AS total FROM qr_sorted_log WHERE sorted_time BETWEEN ? AND ? GROUP BY label`
    }[mode];

    const historyTask = (start && end && historicalQuery) ? new Promise((resolve, reject) => {
        sqlcon.query(historicalQuery, [start, end], (err, results) => {
            if (err) return reject(err);
            finalData.history = results;
            resolve();
        });
    }) : Promise.resolve();

    Promise.all([...positionTasks, pie1, pie2, historyTask])
        .then(() => res.json(finalData))
        .catch(err => res.status(500).json({ error: "Lỗi truy vấn dữ liệu" }));
});
