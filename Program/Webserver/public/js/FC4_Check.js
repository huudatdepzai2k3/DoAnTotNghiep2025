async function searchOrder(check_QR) {
  if (!check_QR) {
    alert("Vui lòng nhập mã QR");
    return;
  }

  try {
    const response = await fetch(`/api/search?qr=${encodeURIComponent(check_QR)}`);

    if (!response.ok) {
      throw new Error("Lỗi từ server: " + response.status);
    }

    const result = await response.json();

    if (!result.found) {
      alert("Không tìm thấy mã QR");
      return;
    }

    const row = result.data;
    document.getElementById("qr_number").innerText = row.qr_code;
    document.getElementById("qr_vitri").innerText = row.address;
    document.getElementById("qr_time").innerText = row.sorted_time.slice(0, 19).replace("T", " ");
    document.getElementById("qr_trangthai").innerText = row.tinhtrang;

  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    alert("Đã xảy ra lỗi khi tìm kiếm dữ liệu.");
  }
}

function fetchTable() {
  const from = document.getElementById("start_date_check").value;
  const to = document.getElementById("end_date_check").value; 

  if (!from || !to) {
    alert("Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.");
    return;
  }

  fetch(`/api/sorted-table?from=${from}&to=${to}`)
    .then(async res => {
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Lỗi khi gọi API");
      }
      return res.json();
    })
    .then(data => {
      const tbody = document.getElementById("resultTable_content");
      tbody.innerHTML = "";

      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="4">Không có dữ liệu trong khoảng thời gian này.</td></tr>`;
        return;
      }

      data.forEach(row => {
        const sortedTime = new Date(row.sorted_time).toLocaleString("vi-VN", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit"
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.qr_code}</td>
          <td>${row.address}</td>
          <td>${sortedTime}</td>
          <td>${row.tinhtrang}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      alert(`Lỗi: ${err.message}`);
    });
}


function exportExcel() {
  const from = document.getElementById("start_date_check").value;
  const to = document.getElementById("end_date_check").value;
  if ( from || to ) {
    window.open(`/export-excel?from=${from}&to=${to}`, "_blank");
  } else {
    alert("Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc")
  } 
}