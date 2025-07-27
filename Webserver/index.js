//////////////////////CẤU HÌNH KẾT NỐI KEPWARE////////////////////
const {TagBuilder, IotGateway} = require('kepserverex-js');
const tagBuilder = new TagBuilder({ namespace: 'Channel1.Device1' });
const iotGateway = new IotGateway({
    host: '127.0.0.1',
    port: 5000
});

// Khai báo SQL
var mysql = require('mysql');
var sqlcon = mysql.createConnection({
    "host": "127.0.0.1",
    "user": "admin",
    "password": "123456",
    "database": "sql_plc",
    "port": 3306,
    "charset": "utf8mb4",      
});

// /////////////////////////THIẾT LẬP KẾT NỐI WEB/////////////////////////
var express = require("express");
var app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000);
// Home calling
app.get("/", function(req, res){
    res.render("home")
});
//

/////////////HÀM ĐỌC/GHI DỮ LIỆU XUỐNG KEPWARE(PLC)//////////////
//Đọc dữ liệu
var tagArr = [];
function fn_tagRead(){
    iotGateway.read(TagList).then((data)=>{
        var lodash = require('lodash');
        tagArr = lodash.map(data, (item) => item.v);
        console.log(tagArr);
    });
}
// Ghi dữ liệu
function fn_Data_Write(tag,data){
    tagBuilder.clean();
    const set_value = tagBuilder
        .write(tag,data)
        .get();
    iotGateway.write(set_value);
}
///////////////////////////ĐỊNH NGHĨA TAG////////////////////////

// === Đọc dữ liệu hmi ===
var sql_insert_Trigger = 'sql_insert_Trigger';
var state_run = "state_run";
var state_auto = "state_auto";
var state_motor = "state_motor";
var state_cam_bien_1 = "state_cam_bien_1";
var state_cam_bien_2 = "state_cam_bien_2";
var state_cam_bien_3 = "state_cam_bien_3";
var state_cam_bien_4 = "state_cam_bien_4";
var state_cam_bien_5 = "state_cam_bien_5";
var state_cam_bien_6 = "state_cam_bien_6";
var state_xi_lanh_1 = "state_xi_lanh_1";
var state_xi_lanh_2 = "state_xi_lanh_2";
var state_xi_lanh_3 = "state_xi_lanh_3";
var state_xi_lanh_4 = "state_xi_lanh_4";
var state_xi_lanh_5 = "state_xi_lanh_5";

// Đọc dữ liệu
const TagList = tagBuilder
.read(state_cam_bien_1)
.read(state_cam_bien_2)
.read(state_cam_bien_3)
.read(state_cam_bien_4)
.read(state_cam_bien_5)
.read(state_cam_bien_6)
.read(state_xi_lanh_1)
.read(state_xi_lanh_2)
.read(state_xi_lanh_3)
.read(state_xi_lanh_4)
.read(state_xi_lanh_5)
.read(state_motor)
.read(state_auto)
.read(state_run)
.read(sql_insert_Trigger)
.get();

///////////////////////////QUÉT DỮ LIỆU////////////////////////
// Tạo Timer quét dữ liệu
setInterval(
    () => fn_read_data_scan(),
    1000 //1000ms = 1s
);
// Quét dữ liệu
function fn_read_data_scan(){
    fn_tagRead();   // Đọc giá trị tag
}

// Ghi dữ liệu vào SQL
var sqlins_done = false; // Biến báo đã ghi xong dữ liệu
function fn_sql_insert(){
    var trigger = tagArr[0];  // Trigger đọc về từ PLC
    var sqltable_Name = "plc_data";
    // Lấy thời gian hiện tại
    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //Vùng Việt Nam (GMT7+)
    var temp_datenow = new Date();
    var timeNow = (new Date(temp_datenow - tzoffset)).toISOString().slice(0, -1).replace("T"," ");
    var timeNow_toSQL = "'" + timeNow + "',";

    // Dữ liệu đọc lên từ các tag
    var data_run = "'" + tagArr[1] + "',";
    var data_auto = "'" + tagArr[2] + "',";
    var data_motor = "'" + tagArr[3] + "',";
    var data_cam_bien_1 = "'" + tagArr[4] + "',";
    var data_cam_bien_2 = "'" + tagArr[5] + "',";
    var data_cam_bien_3 = "'" + tagArr[6] + "',";
    var data_cam_bien_4 = "'" + tagArr[7] + "',";
    var data_cam_bien_5 = "'" + tagArr[8] + "',";
    var data_cam_bien_6 = "'" + tagArr[9] + "',";
    var data_xi_lanh_1 = "'" + tagArr[10] + "',";
    var data_xi_lanh_2 = "'" + tagArr[11] + "',";
    var data_xi_lanh_3 = "'" + tagArr[12] + "',";
    var data_xi_lanh_4 = "'" + tagArr[13] + "',";
    var data_xi_lanh_5 = "'" + tagArr[14] + "',";
    // Ghi dữ liệu vào SQL
    if (trigger == true & trigger != sqlins_done)
    {
        var sqlins1 = "INSERT INTO "
                    + sqltable_Name
                    + " (date_time, data_auto, data_motor, data_cam_bien_1, data_cam_bien_2, data_cam_bien_3, data_cam_bien_4, data_cam_bien_5, data_cam_bien_6, data_xi_lanh_1, data_xi_lanh_2, data_xi_lanh_3, data_xi_lanh_4, data_xi_lanh_5) VALUES (";
        var sqlins2 = timeNow_toSQL
                    + data_auto
                    + data_motor
                    + data_cam_bien_1
                    + data_cam_bien_2
                    + data_cam_bien_3
                    + data_cam_bien_4
                    + data_cam_bien_5
                    + data_cam_bien_6
                    + data_xi_lanh_1
                    + data_xi_lanh_2
                    + data_xi_lanh_3
                    + data_xi_lanh_4
                    + data_xi_lanh_5
                    ;
        var sqlins = sqlins1 + sqlins2 + ");";
        // Thực hiện ghi dữ liệu vào SQL
        sqlcon.query(sqlins, function (err, result) {
            if (err) {
                console.log(err);
             } else {
                console.log("SQL - Ghi dữ liệu thành công");
              }
            });
    }
    sqlins_done = trigger;
}

// Khai báo tag output
var button_state = "state_button"

// ///////////TRUYỀN NHẬN DỮ LIỆU VỚI TRÌNH DUYỆT WEB///////////////////
io.on("connection", function(socket){
    // Bật tắt đây chuyền
    socket.on("Client-send-cmdM1", function(){
        if (button_state == 0) {
            fn_Data_Write(button_state,1);
        } else {
            fn_Data_Write(button_state,0);
        }
    });
});

// Đọc thị dữ liệu Cảnh báo
io.on("connection", function(socket){
    socket.on("msg_Alarm_Show", function(data)
    {
        var sqltable_Name = "alarm";
        var query = "SELECT * FROM " + sqltable_Name + " WHERE Status = 'I';";
        sqlcon.query(query, function(err, results, fields) {
            if (err) {
                console.log(err);
            } else {
                const objectifyRawPacket = row => ({...row});
                const convertedResponse = results.map(objectifyRawPacket);
                socket.emit('Alarm_Show', convertedResponse);
            }
        });
    });
});

// Call API 
app.get("/api/search", function(req, res) {
  const qr = req.query.qr;
  if (!qr) {
    return res.status(400).json({ error: "Thiếu mã QR" });
  }

  const query = `
    SELECT sorted_time, qr_code, address, tinhtrang
    FROM qr_sorted_log
    WHERE qr_code = ?
  `;

  sqlcon.query(query, [qr], function(err, results) {
    if (err) {
      console.error("Lỗi SQL:", err);
      return res.status(500).json({ error: "Lỗi truy vấn SQL" });
    }

    if (results.length === 0) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      data: results[0]
    });
  });
});


app.get("/api/chart-data", function(req, res) {
  const { start, end, mode } = req.query;

  const queries = [
    `SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position = ? AND DATE(sorted_time) = CURDATE()`, 
    `SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position = 6 AND DATE(sorted_time) = CURDATE()`,  
    `SELECT COUNT(*) AS total FROM qr_sorted_log WHERE position BETWEEN 1 AND 5 AND DATE(sorted_time) = CURDATE()` 
  ];

  const historicalModes = {
    day: `
      SELECT DATE(sorted_time) AS label, COUNT(*) AS total
      FROM qr_sorted_log
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY DATE(sorted_time)
    `,
    month: `
      SELECT DATE_FORMAT(sorted_time, '%Y-%m') AS label, COUNT(*) AS total
      FROM qr_sorted_log
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY label
    `,
    year: `
      SELECT DATE_FORMAT(sorted_time, '%Y') AS label, COUNT(*) AS total
      FROM qr_sorted_log
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY label
    `
  };

  const finalData = { position_counts: [], pie: [], history: [] };
  const mysql = require("mysql");

  const tasks = [];
  for (let i = 1; i <= 5; i++) {
    tasks.push(new Promise((resolve, reject) => {
      sqlcon.query(queries[0], [i], (err, result) => {
        if (err) return reject(err);
        finalData.position_counts[i] = result[0].total;
        resolve();
      });
    }));
  }

  tasks.push(new Promise((resolve, reject) => {
    sqlcon.query(queries[1], (err, result) => {
      if (err) return reject(err);
      finalData.pie[0] = result[0].total;
      resolve();
    });
  }));

  tasks.push(new Promise((resolve, reject) => {
    sqlcon.query(queries[2], (err, result) => {
      if (err) return reject(err);
      finalData.pie[1] = result[0].total;
      resolve();
    });
  }));

  // Lịch sử
  if (start && end && mode && historicalModes[mode]) {
    tasks.push(new Promise((resolve, reject) => {
      sqlcon.query(historicalModes[mode], [start, end], (err, results) => {
        if (err) return reject(err);
        finalData.history = results;
        resolve();
      });
    }));
  }

  Promise.all(tasks)
    .then(() => res.json(finalData))
    .catch(err => {
      console.error("Lỗi truy vấn:", err);
      res.status(500).json({ error: "Lỗi truy vấn dữ liệu" });
    });
});
