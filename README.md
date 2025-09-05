# DATN2025 - Design and buid a classification model using QR code for monitoring and control via Webserver

Đồ án tốt nghiệp: Thiết kế mô hình phân loại sản phẩm sử dụng mã QR code giám sát và điều khiển qua webserver

## 🧠 Mô tả hệ thống

Hệ thống giúp **phân loại sản phẩm tự động** thông qua việc:
- Quét **mã QR** trên từng sản phẩm để nhận diện.
- Lưu trữ phân loại liên tục tối đa 21 sản phẩm cùng lúc trên 1 băng tải
- Sử dụng **thị giác máy (Yolov11)** để kiểm tra lỗi sản phẩm (OK/NG).
- Dữ liệu sau khi phân tích sẽ được gửi đến **PLC Siemens S7-1200** để điều khiển hệ thống cơ khí (băng tải, xi lanh).
- Trạng thái hệ thống được **giám sát trực tuyến** qua giao diện PyQt5 và **Webserver** (Node.js + Socket.IO).
- **Lưu trữ và truy xuất dữ liệu** vào Cơ sở dữ liệu **MySQL** để báo cáo và thống kê.

## 💡 Chức năng chính

- 📷 Đọc mã QR bằng camera.
- 🤖 Nhận diện tình trạng sản phẩm (rách/lỗi) bằng Yolov11.
- 📚 Tra cứu địa chỉ từ file Excel.
- 🗺️ Ánh xạ vị trí từ file `.txt`.
- 🔌 Gửi dữ liệu phân loại tới PLC S7-1200 qua Snap7.
- 🗄️ Ghi log vào cơ sở dữ liệu MySQL.
- 🖥️ Giao diện giám sát tình trạng kết nối (PLC, Webserver, MySQL).

## 🧩 Công nghệ sử dụng

- Python 3
- PyQt5
- OpenCV & pyzbar (quét mã QR)
- Yolov11 (ultralytics)
- Snap7 (giao tiếp PLC Siemens S7-1200)
- MySQL & PyMySQL
- pandas (xử lý Excel)
- nodejs
...

## 🔧 Chức năng chính

## 🖥️ PYTHON APP (PYQT5)

- 📷 Kết nối Camera đọc mã QR, hiển thị hình ảnh và kết quả kiểm tra.
- 🧠 Phân tích hình ảnh bằng Yolov11 để xác định sản phẩm lỗi.
- 🗂️ Tra cứu thông tin sản phẩm từ file Excel và file mapping
- 📤 Gửi dữ liệu vị trí sản phẩm cần phân loại về PLC qua S7-1200.
- 🌐 Ghi log vào MySQL (sản phẩm, thời gian, trạng thái phân loại).
- 📊 Hiển thị trạng thái kết nối: PLC, Webserver, MySQL và tự động kết nối lại khi mất kết nối
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
  ...

## 🤖 PLC (Siemens S7-1200 (ladder + SCL))
- ⚙️ Điều khiển băng tải: Quản lý động cơ DC, tín hiệu Start/Stop và Emergency Stop.
- 🔎 Đọc cảm biến: 6 cảm biến tiệm cận phát hiện sản phẩm tại từng vị trí.
- 🚦 Phân loại sản phẩm: Nhận dữ liệu vị trí từ PyQt, điều khiển xi lanh khí nén đẩy sản phẩm chính xác.
- 📦 Quản lý hàng đợi: Xử lý liên tục 21 sản phẩm theo thứ tự, tránh nhầm lẫn.
- 📡 Truyền dữ liệu: Gửi trạng thái cảm biến, xi lanh và băng tải về Webserver/MySQL qua KepServerEX.
- 🛑 An toàn & chế độ vận hành:
  - Ngắt toàn bộ hệ thống khi không có sản phẩm mới trong 5 phút ở chế độ auto
  - Auto: Lưu dữ liệu mới đọc được từ Pyqt5 điều khiển phân loại sản phẩm liên tục
  - Manual: cho phép vận hành thử nghiệm bằng tay.
  - Xử lí sự cố hoạt động ở từng trường hợp khác nhau

---

## 💼 Công nghệ sử dụng

| Thành phần        | Công nghệ sử dụng                                 |
|-------------------|---------------------------------------------------|
| Điều khiển chính  | Siemens PLC S7-1200 + TIA Portal + KepServerEX    |
| Xử lý mã QR       | Python + OpenCV + ZBar                            |
| Nhận diện lỗi     | Yolov11 (Ultralytics) + OpenCV                    |
| Giao diện phần mềm| PyQt5 (Python 3.10)                               |
| Webserver         | Node.js + Express + Socket.IO                     |
| Cơ sở dữ liệu     | MySQL                                             |
| OPC kết nối PLC   | KepServerEX OPC DA                                |

---
## 🧩 Cấu trúc hệ thống

📁 DoAnTotNghiep2025/
├── 🖥️ PythonApp/ # Giao diện người dùng bằng PyQt5
├── 🌐 Webserver/ # Server Express + Socket.IO + MySQL
├── 📦 Models/ # Mô hình Yolov11 phát hiện lỗi
├── 📂 Data/ # File Excel, txt mapping QR → vị trí
└── 📄 README.md

## 🗂️ Cấu trúc thư mục

DoAnTotNghiep2025/
├── Algorithm_Flowchart/       # Lưu đồ thuật toán thiết kế
├──Program
  ├── PLC/                     # Chương trình điều khiển PLC trong TIA Portal
  ├── Webcam_checkQR/          # Ứng dụng giao diện PyQt5
  │   ├── main.py              # Chạy ứng dụng chính
  │   ├── best.pt              # Xử lý hình ảnh với YOLOv11
  │   ├── File_adress.xlsx     # File excel mẫu
  │   └──adress_to_position.txt # File cấu hình vị trí phân loại
  ├── Webserver/               # Node.js Express server
  │   ├── index.js             # Server chính (Backend)
  │   ├── Kepware              # Thư viện kết nối Kepware
  │   ├── node_module          # Thư viện sử dụng cho node của dự án
  │   ├── public/              # Phần frontend (giao diện người dùng)
  │   ├── views/               # Buid giao diện fontend
  │   └──package-lock,package.json #Lưu đường dẫn, phiên bản, thông tin của thư viện
  ├── Database/                 # Cơ sở dữ liệu MySQL
  │   └── sql_plc.sql           # Script cấu trúc database
  ├── Bao_Cao.docx              # Tài liệu về dự án
  └── README.md                 # File mô tả tổng quan dự án


## 🔧 Kết nối & Cấu hình
Thành phần	    Mô tả	                       IP
📶 Laptop      Laptop	                    192.168.0.0
📶 PLC	      Siemens S7-1200	            192.168.0.1
📶 HMI	      KTP-700                     192.168.0.2
🌐 Web        Webserver                   127.0.0.1:3000
📊 MySQL	    SQL                         127.0.0.1:3306


📸 Giao diện ứng dụng
PyQt5 exe : https://drive.google.com/file/d/10DWHhMFaIfd8-AVS8MkQ_WJ49J7wakEh/view?usp=sharing

🧑‍💻 Tác giả
  👨‍🎓 Nguyễn Hữu Đạt - Tự động hóa K66 - Đại học Mỏ - Địa chất
  👨‍🎓 Đặng Vĩnh Hiển - Tự động hóa K66 - Đại học Mỏ - Địa chất

🏫 Đồ án tốt nghiệp ngành Tự Động Hóa

📬 Email: huudatdepzai2k3@gmail.com

🌟 Góp ý & Đóng góp
Mọi ý tưởng, góp ý hoặc pull request đều được hoan nghênh!
Hãy ⭐ repo nếu bạn thấy hữu ích!

