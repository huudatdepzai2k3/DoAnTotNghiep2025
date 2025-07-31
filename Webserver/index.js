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
    "state_cam_bien_1", "state_cam_bien_2", "state_cam_bien_3", "state_cam_bien_4",
    "state_cam_bien_5", "state_cam_bien_6",
    "state_xi_lanh_1", "state_xi_lanh_2", "state_xi_lanh_3", "state_xi_lanh_4", "state_xi_lanh_5"
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
    const sql = `INSERT INTO plc_data (date_time, data_auto, data_motor, data_cam_bien_1, data_cam_bien_2, data_cam_bien_3, data_cam_bien_4, data_cam_bien_5, data_cam_bien_6, data_xi_lanh_1, data_xi_lanh_2, data_xi_lanh_3, data_xi_lanh_4, data_xi_lanh_5)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    sqlcon.query(sql, values, err => {
        if (err) console.log("❌ SQL INSERT error:", err);
        else console.log("✅ SQL ghi dữ liệu thành công");
    });
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
