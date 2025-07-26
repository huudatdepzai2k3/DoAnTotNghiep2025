const mysql = require('mysql2/promise');
async function getDataAndDrawCharts() {
  document.getElementById("last_update").innerText = new Date().toLocaleTimeString();
  // Kết nối đến cơ sở dữ liệu MySQL
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "123456",
      database: "SQL_PLC",
      dateStrings:true
    });

    if (window.columnChart) window.columnChart.destroy();
    if (window.pieChart) window.pieChart.destroy();
    if (window.historyChart) window.historyChart.destroy();

    // Đếm sản phẩm ở từng vị trí
    const counts = new Array(7).fill(0);
    for (let i = 1; i <= 6; i++) {
      const [rows] = await conn.execute(`SELECT COUNT(*) AS total FROM products WHERE position = ? AND DATE(sorted_time) = CURDATE()`, [i]);
      counts[i] = rows[0].total;
    }

    const yValues_1 = [counts[1], counts[2], counts[3], counts[4], counts[5]];
    const yValues_2 = [counts[6], counts[1] + counts[2] + counts[3] + counts[4] + counts[5]];

    // Vẽ biểu đồ cột
    window.columnChart = new Chart("columnchart", {
      type: "bar",
      data: {
        labels: ["Cầu Giấy", "Nam Từ Liêm", "Bắc Từ Liêm", "Thanh Xuân", "Hà Đông"],
        datasets: [{
          backgroundColor: ["red", "green","blue","orange","brown"],
          data: yValues_1
        }]
      },
      options: {
        legend: {display: false},
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            }
          }],
        }
      }
    });

    // Vẽ biểu đồ tròn
    window.pieChart = new Chart("piechart", {
      type: "pie",
      data: {
        labels: ["Hàng Lỗi", "Hàng phân loại ok"],
        datasets: [{
          backgroundColor: ["red", "green"],
          data: yValues_2
        }]
      },
    });

    // Vẽ biểu đồ lịch sử nếu chọn thời gian
    let rows, xValues_3, yValues_3;
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    if (!start || !end) {
      alert("Vui lòng chọn ngày bắt đầu và kết thúc!");
      return;
    }

    if (document.getElementById("check_day").checked) {
    [rows] = await conn.execute(`
      SELECT DATE(sorted_time) AS label, COUNT(*) AS total
      FROM products_sorted
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY DATE(sorted_time)
    `, [start, end]);
    } else if (document.getElementById("check_month").checked) {
    [rows] = await conn.execute(`
      SELECT DATE_FORMAT(sorted_time, '%Y-%m') AS label, COUNT(*) AS total
      FROM products_sorted
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY label
    `, [start, end]);
    } else if (document.getElementById("check_year").checked) {
    [rows] = await conn.execute(`
      SELECT DATE_FORMAT(sorted_time, '%Y') AS label, COUNT(*) AS total
      FROM products_sorted
      WHERE sorted_time BETWEEN ? AND ?
      GROUP BY label
    `, [start, end]);
    }

    if (rows && rows.length > 0) {
      xValues_3 = rows.map(r => r.label);
      yValues_3 = rows.map(r => r.total);
      const max_val = Math.max(...yValues_3);
      window.historyChart = new Chart("historychart", {
        type: "line",
        data: {
          labels: xValues_3,
          datasets: [{
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(0,0,255,1.0)",
            borderColor: "rgba(0,0,255,0.1)",
            data: yValues_3
          }]
        },
        options: {
          legend: {display: false},
          scales: {
            yAxes: [{ticks: {min: 0, max:max_val}}],
          }
        }
      });
    } else {
      alert("Không có dữ liệu trong khoảng thời gian đã chọn!");
      return;
    }
    await conn.end();
  } catch (err) {
    console.error("Lỗi kết nối hoặc truy vấn MySQL:", err);
    alert("Không thể lấy dữ liệu từ server.");
  }
}

setInterval(() => {
  getDataAndDrawCharts();
}, 10000); // 10 giây = 10000 mili giây