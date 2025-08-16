async function getDataAndDrawCharts() {
  document.getElementById("last_update").innerText = new Date().toLocaleTimeString();

  if (window.columnChart) window.columnChart.destroy();
  if (window.pieChart) window.pieChart.destroy();
  if (window.historyChart) window.historyChart.destroy();

  const start = document.getElementById('start_date').value;
  const end = document.getElementById('end_date').value;

  if (!start || !end) {
    alert("Vui lòng chọn ngày bắt đầu và kết thúc!");
    return;
  }

  let mode = null;
  if (document.getElementById("check_day").checked) mode = "day";
  else if (document.getElementById("check_month").checked) mode = "month";
  else if (document.getElementById("check_year").checked) mode = "year";

  try {
    const res = await fetch(`/api/chart-data?start=${start}&end=${end}&mode=${mode}`);
    const data = await res.json();

    const yValues_1 = data.position_counts.slice(1, 6);
    const yValues_2 = data.pie;

    window.columnChart = new Chart("columnchart", {
      type: "bar",
      data: {
        labels: ["Cầu Giấy", "Nam Từ Liêm", "Bắc Từ Liêm", "Thanh Xuân", "Hà Đông"],
        datasets: [{
          backgroundColor: ["red", "green", "blue", "orange", "brown"],
          data: yValues_1
        }]
      },
      options: {
        responsive: true, 
        maintainAspectRatio: false,
        legend: { display: false },
        scales: { yAxes: [{ ticks: { beginAtZero: true , stepSize: 1} }] }
      }
    });

    window.pieChart = new Chart("piechart", {
      type: "pie",
      data: {
        labels: ["Hàng Lỗi", "Hàng phân loại OK"],
        datasets: [{
          backgroundColor: ["red", "green"],
          data: yValues_2
        }]
      ,options: {
          responsive: true, 
          maintainAspectRatio: false, 
        }
      }
    });

    if (data.history.length > 0) {
      const xValues_3 = data.history.map(r => r.label.replace('T', ' ').replace('Z', ''));
      const yValues_3 = data.history.map(r => r.total);
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
            responsive: true, 
            maintainAspectRatio: false, 
          legend: { display: false },
          scales: { yAxes: [{ ticks: { min: 0, max: max_val } }] }
        }
      });
    } else {
      alert("Không có dữ liệu trong khoảng thời gian đã chọn!");
    }

  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu từ API:", err);
    alert("Không thể lấy dữ liệu từ server.");
  }
}

// cài ngày mặc định
let today = new Date();
let endDate = today.toISOString().split('T')[0];
let pastDate = new Date();
pastDate.setDate(today.getDate() - 7);
let startDate = pastDate.toISOString().split('T')[0];
document.getElementById("start_date").value = startDate;
document.getElementById("end_date").value = endDate;
