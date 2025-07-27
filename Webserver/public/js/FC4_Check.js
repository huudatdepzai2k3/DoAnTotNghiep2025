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
    document.getElementById("qr_time").innerText = row.sorted_time;
    document.getElementById("qr_trangthai").innerText = row.tinhtrang;

  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    alert("Đã xảy ra lỗi khi tìm kiếm dữ liệu.");
  }
}
