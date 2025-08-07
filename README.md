# DATN2025 - Mô Hình Phân Loại Sản Phẩm Tự Động

Đồ án tốt nghiệp: Thiết kế mô hình điều khiển và giám sát phân loại sản phẩm theo mã QR bằng PLC S7-1200 tích hợp công nghệ thị giác máy và Webserver

## 🧠 Mô tả hệ thống

Hệ thống giúp **phân loại sản phẩm tự động** thông qua việc:
- Quét **mã QR** trên từng sản phẩm để nhận diện.
- Sử dụng **thị giác máy (YOLOv8)** để kiểm tra lỗi sản phẩm (OK/NG).
- Dữ liệu sau khi phân tích sẽ được gửi đến **PLC Siemens S7-1200** để điều khiển hệ thống cơ khí (băng tải, xi lanh).
- Trạng thái hệ thống được **giám sát trực tuyến** qua giao diện PyQt5 và **Webserver** (Node.js + Socket.IO).
- **Lưu trữ và truy xuất dữ liệu** vào Cơ sở dữ liệu **MySQL** để báo cáo và thống kê.

## 💡 Chức năng chính

- 📷 Đọc mã QR bằng camera.
- 🤖 Nhận diện tình trạng sản phẩm (rách/lỗi) bằng YOLOv8.
- 📚 Tra cứu địa chỉ từ file Excel.
- 🗺️ Ánh xạ vị trí từ file `.txt`.
- 🔌 Gửi dữ liệu phân loại tới PLC S7-1200 qua Snap7.
- 🗄️ Ghi log vào cơ sở dữ liệu MySQL.
- 🖥️ Giao diện giám sát tình trạng kết nối (PLC, Webserver, MySQL).

## 🧩 Công nghệ sử dụng

- Python 3
- PyQt5
- OpenCV & pyzbar (quét mã QR)
- YOLOv8 (ultralytics)
- Snap7 (giao tiếp PLC Siemens S7-1200)
- MySQL & PyMySQL
- pandas (xử lý Excel)
- nodejs

## 🔧 Chức năng chính

## 🖥️ PYTHON APP (PYQT5)

- 📷 Kết nối Camera đọc mã QR, hiển thị hình ảnh và kết quả kiểm tra.
- 🧠 Phân tích hình ảnh bằng YOLOv8 để xác định sản phẩm lỗi.
- 🗂️ Tra cứu thông tin sản phẩm từ file Excel và file mapping
- 📤 Gửi dữ liệu vị trí sản phẩm cần phân loại về PLC qua S7-1200.
- 🌐 Ghi log vào MySQL (sản phẩm, thời gian, trạng thái phân loại).
- 📊 Hiển thị trạng thái kết nối: PLC, Webserver, MySQL
- 🛢️Lưu trữ dữ liệu phân loại khi gặp sự cố kết nối

## 🌐 WEBSERVER (Node.js + Express + MySQL)
- Giao tiếp real-time với PLC qua KepServerEX OPC.
- 📡Nhận dữ liệu trạng thái phân loại từ PLC.
- 🛢️Lưu trữ trạng thái cảm biến, xi lanh vào MySQL.
- 🧑‍💼 Quản lý người dùng (đăng nhập, phân quyền, đổi mật khẩu).
- 📊Giao diện giám sát hiển thị dữ liệu & biểu đồ phân loại, tình trạng hệ thống trong thời gian thực
- Biểu đồ thống kê, tra cứu thời gian thực.
-📥 Xuất báo cáo phân loại qua Excel
- API RESTful:
  - `GET /api/search` – Tìm kiếm dữ liệu
  - `POST /api/login` – Đăng nhập người dùng
  - `GET /export-excel` – Xuất dữ liệu ra Excel
  - `GET /api/chart-data` – Trả về dữ liệu vẽ biểu đồ

---

## 💼 Công nghệ sử dụng

| Thành phần        | Công nghệ sử dụng                                 |
|-------------------|---------------------------------------------------|
| Điều khiển chính  | Siemens PLC S7-1200 + TIA Portal + KepServerEX    |
| Xử lý mã QR       | Python + OpenCV + ZBar                            |
| Nhận diện lỗi     | YOLOv8 (Ultralytics) + OpenCV                     |
| Giao diện phần mềm| PyQt5 (Python 3.10)                               |
| Webserver         | Node.js + Express + Socket.IO                     |
| Cơ sở dữ liệu     | MySQL                                             |
| OPC kết nối PLC   | KepServerEX OPC DA                                |

---
## 🧩 Cấu trúc hệ thống

📁 DoAnTotNghiep2025/
├── 🖥️ PythonApp/ # Giao diện người dùng bằng PyQt5
├── 🌐 Webserver/ # Server Express + Socket.IO + MySQL
├── 📦 Models/ # Mô hình YOLOv8 phát hiện lỗi
├── 📂 Data/ # File Excel, txt mapping QR → vị trí
└── 📄 README.md

## 🗂️ Cấu trúc thư mục

DoAnTotNghiep2025/
├── PLC/ # Chương trình điều khiển PLC trong TIA Portal
├── PyQtApp/ # Ứng dụng giao diện PyQt5
│ ├── main.py # Chạy ứng dụng chính
│ ├── yolov8_utils.py # Hàm xử lý hình ảnh YOLOv8
│ ├── plc_communication.py # Gửi dữ liệu tới PLC
│ └── config.ini # File cấu hình IP, URL, ...
├── Webserver/ # Node.js Express Server
│ ├── index.js # Server chính
│ ├── routes/ # Các API route (login, export, search,...)
│ ├── socket/ # Socket.IO xử lý kết nối real-time
│ ├── public/ # Giao diện frontend
│ └── config.js # Cấu hình database
├── Data/
│ ├── excel_data.xlsx # Dữ liệu mã QR, thông tin sản phẩm
│ └── mapping.txt # File ánh xạ mã QR sang vị trí PLC
├── Database/
│ └── sql_plc.sql # Cấu trúc cơ sở dữ liệu MySQL
├── docs/ # Tài liệu, ảnh minh họa, sơ đồ hệ thống
│ ├── pyqt_ui.png
│ └── system_diagram.png
└── README.md # File tài liệu này

🔧 Kết nối & Cấu hình
Thành phần	Mô tả	Cấu hình
📶 PLC	Siemens S7-1200	Địa chỉ IP được cấu hình trong PyQt
🔍 Camera	USB/RTSP hỗ trợ OpenCV	Sử dụng cv2.VideoCapture()
📊 MySQL	Lưu trạng thái thiết bị	File config.js và .env
🧠 YOLOv8	Phát hiện lỗi sản phẩm	File best.pt trong Models/

📸 Giao diện ứng dụng
PyQt5 App	Web Giám sát

🧑‍💻 Tác giả
    👨‍🎓 Nguyễn Hữu Đạt - Tự động hóa K66 - Đại học Mỏ - Địa chất
    👨‍🎓 Đặng Vĩnh Hiển - Tự động hóa K66 - Đại học Mỏ - Địa chất

🏫 Đồ án tốt nghiệp ngành Tự Động Hóa

📬 Email: huudatdepzai2k3@gmail.com

🌟 Góp ý & Đóng góp
Mọi ý tưởng, góp ý hoặc pull request đều được hoan nghênh!
Hãy ⭐ repo nếu bạn thấy hữu ích!

