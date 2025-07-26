// check qr
async function searchOrder(check_QR) {
  if (!check_QR) {
    alert("Vui lòng nhập mã QR");
    return;
  } else {
    const connection = await mysql.createConnection(dbConfig);
    const query = `
      SELECT sorted_time, qr_code, address, tinhtrang
      FROM orders
      WHERE qr_code = ?
    `;
    const [rows] = await connection.execute(query, [check_QR]);
    if (rows.length === 0) {
      alert("Không tìm thấy mã QR");
      return;
    } else {
      document.getElementById("qr_number").innerText = check_QR;
      document.getElementById("qr_vitri").innerText = rows.map(row => row.address);
      document.getElementById("qr_time").innerText = rows.map(row => row.sorted_time);
      document.getElementById("qr_trangthai").innerText = rows.map(row => row.tinhtrang);
    }
    await connection.end();
  }
}

// 