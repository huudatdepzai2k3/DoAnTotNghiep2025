import sys
import pandas as pd
import cv2
from pyzbar import pyzbar
import numpy as np
import time
import os
import requests
import datetime
import pymysql
from ultralytics import YOLO
import snap7
from snap7.util import set_int
from PyQt5.QtCore import Qt, pyqtSignal, QThread, QTimer
from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout,QLabel, QPushButton, QTextEdit, QFileDialog, QLineEdit)
from PyQt5.QtGui import QPixmap, QImage, QFont

# Định nghĩa thông số kết nối PLC và Webserver
PLC_IP = '192.168.0.1'
RACK = 0
SLOT = 1
DB_NUMBER = 7
WEBSERVER_URL = 'http://127.0.0.1:3000'

# Thông tin kết nối MySQL
db_config = {
    "host": "127.0.0.1",
    "user": "admin",
    "password": "123456",
    "database": "sql_plc",
    "port": 3306,
    "charset": "utf8mb4",      
    "cursorclass": pymysql.cursors.DictCursor
}

# Các biến lưu trạng thái IP và URL hiện tại
plc_ip_current = PLC_IP
webserver_url_current = WEBSERVER_URL
last_camera_connected = False

# Khởi tạo kết nối với PLC
client = snap7.client.Client()
stop_threads = False

try:
    client.connect(plc_ip_current, RACK, SLOT)
    print("✅ Kết nối PLC lần đầu thành công.")
except Exception as e:
    print(f"❌ Không thể kết nối PLC lần đầu: {e}")

try:
    conn = pymysql.connect(**db_config)
    if conn.open:
        print("✅ Đã kết nối lần đầu thành công tới MySQL bằng PyMySQL.")
    else:
        print("❌ Không thể kết nối MySQL.")
except pymysql.MySQLError as e:
    print("❌ Lỗi kết nối MySQL:", e)

# Kiểm tra kết nối đến PLC
def is_connected(client):
    try:
        return client.get_connected()
    except:
        return False

# Kiểm tra kết nối đến Webserver
def is_connected_webserver():
    try:
        response = requests.get(webserver_url_current, timeout=3)
        return response.status_code == 200
    except:
        return False
    
## Kiểm tra kết nối đến Mysql
def is_connected_mysql():
    try:
        conn = pymysql.connect(**db_config)
        if conn.open:
            return True
        else:
            return False
    except pymysql.MySQLError as e:
        return False

# Hàm ghi log QR code vào MySQL 
def insert_qr_sorting(qr_code, address, tinhtrang, position, sorted_time=None):
    import os
    if sorted_time is None:
        sorted_time = datetime.datetime.now()

    conn = None
    cursor = None
    try:
        conn = pymysql.connect(**db_config)
        cursor = conn.cursor()

        sql = """SELECT 1 FROM qr_sorted_log WHERE qr_code=%s LIMIT 1"""
        cursor.execute(sql, (qr_code,))
        result = cursor.fetchone()

        if result is not None:
            sql = """
                UPDATE qr_sorted_log
                SET sorted_time=%s, address=%s, tinhtrang=%s, position=%s
                WHERE qr_code=%s
            """
            values = (sorted_time, address, tinhtrang, position, qr_code)
            cursor.execute(sql, values)
            conn.commit()
        else:
            sql = """
                INSERT INTO qr_sorted_log (sorted_time, qr_code, address, tinhtrang, position)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (sorted_time, qr_code, address, tinhtrang, position)
            cursor.execute(sql, values)
            conn.commit()

        window.log_to_terminal(f"✅ Ghi thành công QR: {qr_code} vào MySQL lúc {sorted_time}")
    except (pymysql.MySQLError, Exception) as e:
        window.log_to_terminal(f"❌ Lỗi ghi MySQL: {e}")

        # Tạo dữ liệu ghi vào CSV
        data = {
            "sorted_time": [sorted_time],
            "qr_code": [qr_code],
            "address": [address],
            "tinhtrang": [tinhtrang],
            "position": [position]
        }
        df = pd.DataFrame(data)

        csv_file = "product_log.csv"
        # Nếu file chưa tồn tại, ghi header; nếu tồn tại thì ghi nối tiếp
        write_header = not os.path.exists(csv_file)
        df.to_csv(csv_file, mode='a', index=False, header=write_header, encoding='utf-8')
        print(f"⚠️ Đã ghi dữ liệu vào file tạm: {csv_file}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def send_data_to_plc_SQL(qr_code, address, tinhtrang, position):
    if is_connected(client):
        if snap7.util.get_bool(client.db_read(7, 2, 1), 0, 2):
            try:
                if 1 <= position <= 6:
                    data_push = bytearray(2)
                    snap7.util.set_int(data_push, 0, position)
                    client.db_write(DB_NUMBER,0,data_push)

                    data_push_1 = client.db_read(DB_NUMBER,2,1)
                    snap7.util.set_bool(data_push_1, 0, 0, True)
                    client.db_write(DB_NUMBER,2,data_push_1)
                    time.sleep(0.2)
                    snap7.util.set_bool(data_push_1, 0, 0, False)
                    client.db_write(DB_NUMBER,2,data_push_1)
                    window.log_to_terminal(f"📤 Gửi vị trí vào PLC: {position}")
                    insert_qr_sorting(qr_code, address, tinhtrang, position)
                else:
                    window.log_to_terminal(f"⚠️ Vị trí {position} không hợp lệ")
            except Exception as e:
                window.log_to_terminal(f"❌ Lỗi gửi dữ liệu vị trí vào PLC: {e}")
        else :
            window.log_to_terminal("⚠️ Hệ thống đang lỗi, PLC không sẵn sàng để nhận dữ liệu.")
    else:
        window.log_to_terminal(f"❌ Lỗi gửi dữ liệu vào PLC do mất kết nối với PLC")

# Lấy vị trí từ dữ liệu Excel và gửi vào PLC
def get_position_from_file(qr_code, tinhtrang):
    global window
    try:
        if 'window' not in globals() or not hasattr(window, 'data_dict'):
            window.log_to_terminal("⚠️ Chưa tải dữ liệu Excel.")
            return

        # Kiểm tra mã QR có trong dữ liệu
        if qr_code not in window.data_dict:
            window.log_to_terminal("⚠️ QR code không tồn tại trong dữ liệu Excel.")
            window.qr_label_2.setText("📦 Tình trạng hàng: Không xác định")
            send_data_to_plc_SQL(qr_code, "Không xác định", "Không xác định", 6)
            return
        else :    
            address = str(window.data_dict[qr_code]).strip()
            window.pos_label.setText(f"📍 Vị trí: {address}")
            words1 = address.lower().split()

           # Tìm file_address có cụm từ chung dài nhất
            max_len_max = 0
            best_match = None
            for file_address, file_pos in window.address_to_pos_dict.items():
                words2 = file_address.lower().split()
                n, m = len(words1), len(words2)
                dp = [[0] * (m + 1) for _ in range(n + 1)]
                max_len = 0

                for i in range(n):
                    for j in range(m):
                        if words1[i] == words2[j]:
                            dp[i + 1][j + 1] = dp[i][j] + 1
                            if dp[i + 1][j + 1] > max_len:
                                max_len = dp[i + 1][j + 1]
                        else:
                            dp[i + 1][j + 1] = 0

                if max_len > max_len_max:
                    max_len_max = max_len
                    best_match = (file_address, file_pos)

            # Nếu tìm được cụm từ chung phù hợp
            if best_match and max_len_max > 0:
                file_address, file_pos = best_match
                words3 = file_address.lower().split()
                common_phrases = [
                    ' '.join(words1[i:i+max_len_max])
                    for i in range(len(words1) - max_len_max + 1)
                    if ' '.join(words1[i:i+max_len_max]) in ' '.join(words3)
                ]

                if common_phrases:
                    if tinhtrang == 'hàng rách':
                        pos = 6
                    else:
                        pos = int(file_pos)
                    window.log_to_terminal(f"✅ Vị trí phân loại: {pos}")
                    send_data_to_plc_SQL(qr_code, address, tinhtrang, pos)
            else:
                window.log_to_terminal("⚠️ Không tìm thấy vị trí phù hợp.")
                        
    except Exception as e:
        window.log_to_terminal(f"❌ Lỗi đọc file: {e}")

# Lớp theo dõi trạng thái kết nối PLC và Webserver
class ConnectionMonitorThread(QThread):
    status_updated = pyqtSignal(bool, bool, bool)
    last_plc_status = None
    last_web_status = None
    last_mysql_status = None

    def run(self):
        global stop_threads
        while not stop_threads:
            if is_connected(client) != self.last_plc_status or is_connected_webserver() != self.last_web_status or is_connected_mysql() != self.last_mysql_status:
                self.status_updated.emit(is_connected(client), is_connected_webserver(), is_connected_mysql())
                self.last_plc_status = is_connected(client)
                self.last_web_status = is_connected_webserver()
                self.last_mysql_status = is_connected_mysql()

            if is_connected_mysql():
                # Ghi lại dữ liệu từ product_log.csv (nếu có)
                csv_file = 'product_log.csv'
                if os.path.exists(csv_file):
                    df = pd.read_csv(csv_file)
                    for _, row in df.iterrows():
                        sorted_time = row['sorted_time']
                        qr_code = row['qr_code']
                        address = row['address']
                        tinhtrang = row['tinhtrang']
                        position = row['position']
                        insert_qr_sorting(qr_code, address, tinhtrang, position, sorted_time)

                    # Ghi xong toàn bộ thì xóa file
                    os.remove(csv_file)
                    window.log_to_terminal("🗑️ Đã ghi lại và xóa file product_log.csv")
            else:
                window.log_to_terminal("🔄 Mất kết nối PLC. Thử kết nối lại...")
                try:
                    if not client.get_connected():
                        client.connect(plc_ip_current, RACK, SLOT)
                        window.log_to_terminal("✅ Đã kết nối lại PLC thành công.")
                except Exception as e:
                    window.log_to_terminal(f"❌ Lỗi kết nối lại PLC: {e}")

            # Xử lý mất kết nối PLC
            if not is_connected(client):
                window.log_to_terminal("🔄 Mất kết nối PLC. Thử kết nối lại...")
                try:
                    if not client.get_connected():
                        client.connect(plc_ip_current, RACK, SLOT)
                        window.log_to_terminal("✅ Đã kết nối lại PLC thành công.")
                except Exception as e:
                    window.log_to_terminal(f"❌ Lỗi kết nối lại PLC: {e}")

            # Xử lý mất kết nối Webserver
            if not is_connected_webserver():
                window.log_to_terminal("🔄 Mất kết nối Webserver. Thử kết nối lại...")
                try:
                    response = requests.get(WEBSERVER_URL)
                    if response.status_code == 200:
                        window.log_to_terminal("✅ Đã kết nối lại Webserver thành công.")
                    else:
                        window.log_to_terminal("❌ Không thể kết nối lại Webserver.")
                except Exception as e:
                    window.log_to_terminal(f"❌ Lỗi kết nối lại Webserver: {e}")

            time.sleep(5)

# Lớp giao diện chính ứng dụng
class DemoApp(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Giao diện đầu vào")
        self.setFixedSize(1800, 600)
        self.setGeometry(100, 100, 1000, 300)

        self.capture = cv2.VideoCapture(0)
        self.capture.set(3, 640)
        self.capture.set(4, 480)
        self.camera_connected = self.capture.isOpened()
        self.last_camera_connected = False
         
        self.yolo_model = YOLO("best.pt")  

        self.last_qr_code = ""
        self.last_detection_time = time.time()

        # Tạo QTimer để xử lý frame định kỳ
        self.camera_timer = QTimer()
        self.camera_timer.timeout.connect(self.read_frame)
        self.camera_timer.start(30)  # Mỗi 30ms ~ 33 FPS

        # Thiết lập giao diện
        main_layout = QHBoxLayout()

        self.excel_btn = QPushButton("📂 Chọn file Excel")
        self.excel_btn.clicked.connect(self.load_excel)  
        self.excel_display = QTextEdit()
        self.excel_display.setReadOnly(True)

        left_layout = QVBoxLayout()
        left_layout.addWidget(QLabel("🗂 Nhập dữ liệu từ Excel:"))
        left_layout.addWidget(self.excel_btn)
        left_layout.addWidget(self.excel_display)

        # Hiển thị video từ camera
        self.image_label = QLabel()
        self.image_label.setFixedSize(640, 480)
        self.image_label.setStyleSheet("background-color: lightgray")

        center_layout = QVBoxLayout()
        center_layout.addWidget(QLabel("🎥 Camera (video trực tiếp):"))
        center_layout.addWidget(self.image_label)

        # Hiển thị thông tin về mã QR và vị trí
        self.qr_label = QLabel("📦 Mã QR: (chưa có)")
        self.pos_label = QLabel("📍 Vị trí: (chưa có)")
        self.qr_label_2 = QLabel("📦 Tình trạng hàng: (chưa có)")
        self.plc_status_label = QLabel("🔌 PLC: Đang kiểm tra...")
        self.webserver_status_label = QLabel("🔌 Webserver: Đang kiểm tra...")
        self.mySQL_status_label = QLabel("🔌 MySQL: Đang kiểm tra...")

        # Đèn báo trạng thái kết nối
        self.plc_status_led = QLabel()
        self.plc_status_led.setFixedSize(20, 20)
        self.webserver_status_led = QLabel()
        self.webserver_status_led.setFixedSize(20, 20)
        self.mySQL_status_led = QLabel()
        self.mySQL_status_led.setFixedSize(20, 20)

        # Các layout cho PLC và Webserver
        plc_layout = QHBoxLayout()
        plc_layout.addWidget(self.plc_status_label)
        plc_layout.addWidget(self.plc_status_led)
        web_layout = QHBoxLayout()
        web_layout.addWidget(self.webserver_status_label)
        web_layout.addWidget(self.webserver_status_led)
        mySQL_layout = QHBoxLayout()
        mySQL_layout.addWidget(self.mySQL_status_label)
        mySQL_layout.addWidget(self.mySQL_status_led)

        self.ip_input = QLineEdit()
        self.ip_input.setText(PLC_IP)
        self.url_input = QLineEdit()
        self.url_input.setText(WEBSERVER_URL)

        self.ip_btn = QPushButton("🔄 Cập nhật IP và URL mới.")
        self.ip_btn.clicked.connect(self.update_plc_webserver_address)

        right_layout = QVBoxLayout()
        right_layout.addWidget(QLabel("📤 Thông tin Output:"))
        right_layout.addWidget(self.qr_label)
        right_layout.addWidget(self.pos_label)
        right_layout.addWidget(self.qr_label_2)
        right_layout.addLayout(plc_layout)
        right_layout.addLayout(web_layout)
        right_layout.addLayout(mySQL_layout)
        right_layout.addWidget(QLabel("🌐 URL Webserver:"))
        right_layout.addWidget(self.url_input)
        right_layout.addWidget(QLabel("🌐 IP PLC:"))
        right_layout.addWidget(self.ip_input)
        right_layout.addWidget(self.ip_btn)
        right_layout.addStretch()

        # Output cho terminal log
        self.terminal_output = QTextEdit()
        self.terminal_output.setReadOnly(True)
        self.terminal_output.setStyleSheet("background-color: black; color: white;")
        font = QFont("Consolas")
        font.setPointSize(9)
        self.terminal_output.setFont(font)

        terminal_layout = QVBoxLayout()
        terminal_layout.addWidget(QLabel("🖥 Terminal Output:"))
        terminal_layout.addWidget(self.terminal_output)

        main_layout.addLayout(left_layout)
        main_layout.addLayout(center_layout)
        main_layout.addLayout(right_layout)
        main_layout.addLayout(terminal_layout)

        self.setLayout(main_layout)
        self.data_dict = {}
        self.address_to_pos_dict = {}

        # # Khởi tạo các thread
        self.connection_thread = ConnectionMonitorThread()
        self.connection_thread.status_updated.connect(self.update_status)
        self.connection_thread.start()
    
    # Kiểm tra kết nối camera
    def check_camera_connection(self):
        if not self.capture.isOpened():
            self.log_to_terminal("🔄 Mất kết nối camera. Đang thử kết nối lại...")
            self.capture.release()
            self.capture = cv2.VideoCapture(0)
            self.capture.set(3, 640)
            self.capture.set(4, 480)
            if self.capture.isOpened():
                self.log_to_terminal("✅ Đã kết nối lại camera thành công.")
                self.camera_connected = True
            else:
                self.log_to_terminal("❌ Không thể kết nối lại camera.")
                self.camera_connected = False

    # Hàm log thông báo vào terminal
    def log_to_terminal(self, msg):
        self.terminal_output.append(msg)
        self.terminal_output.moveCursor(self.terminal_output.textCursor().End)

        max_lines = 200
        doc = self.terminal_output.document()
        if doc.blockCount() > max_lines:
            cursor = self.terminal_output.textCursor()
            cursor.movePosition(cursor.Start)
            for _ in range(doc.blockCount() - max_lines):
                cursor.select(cursor.BlockUnderCursor)
                cursor.removeSelectedText()
                cursor.deleteChar()

    # Hàm tải dữ liệu từ file Excel
    def load_excel(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Chọn file Excel", "", "Excel Files (*.xlsx *.xls)")
        if file_path:
            try:
                df = pd.read_excel(file_path)
                if not {'QR', 'Address'}.issubset(df.columns):
                    self.excel_display.setText("❌ File Excel cần có cột 'QR' và 'Address'")
                    return
                self.excel_display.setText(str(df))
                self.data_dict = {str(row['QR']).strip(): row['Address'] for _, row in df.iterrows()}
                self.address_to_pos_dict = {}
                file_path_txt = os.path.join(os.getcwd(), "adress_to_position.txt")
                if os.path.exists(file_path_txt):
                    with open(file_path_txt, "r", encoding="utf-8") as f:
                        for line in f:
                            parts = line.strip().split(' | ')
                            if len(parts) >= 2:
                                addr, pos = parts
                                self.address_to_pos_dict[addr.strip()] = int(float(pos))
                else :
                    self.log_to_terminal("❌ Thiếu dữ liệu vị trí setup.")
                self.log_to_terminal("✅ Đã tải dữ liệu Excel và dữ liệu vị trí.")
            except Exception as e:
                self.excel_display.setText(f"Lỗi: {e}")
                self.log_to_terminal(f"❌ Lỗi tải Excel: {e}")

    def read_frame(self):
        tinhtrang_send = None
        tinhtrang = None
        if not self.capture.isOpened():
            self.check_camera_connection()
            return

        ret, frame = self.capture.read()
        if not ret or frame is None:
            self.log_to_terminal("⚠️ Không đọc được frame từ camera.")
            self.check_camera_connection()
            return
        
        # Gửi trạng thái kết nối camera vào PLC       
        if self.camera_connected != self.last_camera_connected:
            if is_connected(client):
                data_push_2 = client.db_read(DB_NUMBER,2,1)
                snap7.util.set_bool(data_push_2, 0, 1, self.camera_connected)
                client.db_write(DB_NUMBER,2,data_push_2)
                self.last_camera_connected = self.camera_connected
          
        # ---------- YOLOv8 Object Detection ----------
        results = self.yolo_model(frame)[0]
        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            tinhtrang = self.yolo_model.names[cls_id]
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            color = (0, 255, 0) if tinhtrang != 'hang_rach' else (0, 0, 0)  
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"{tinhtrang} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Quét QR code
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        qrcodes = pyzbar.decode(gray)

        for qrcode in qrcodes:
            (x, y, w, h) = qrcode.rect
            if w > 0 and h > 0:
                data = qrcode.data.decode('utf-8')
                # Mỗi 0.5s xử lý mã QR mới
                if time.time() - self.last_detection_time > 0.5 and data != self.last_qr_code:
                    self.last_qr_code = data
                    self.last_detection_time = time.time()
                    self.log_to_terminal(f"📷 Mã QR mới: {data}")
                    self.qr_label.setText(f"📦 Mã QR: {data}")
                    if tinhtrang == 'hang_rach':
                        self.qr_label_2.setText("📦 Tình trạng hàng: Rách")
                        tinhtrang_send = 'hàng rách'
                    else:
                        self.qr_label_2.setText("📦 Tình trạng hàng: Bình thường")
                        tinhtrang_send = 'bình thường'

                    get_position_from_file(data, tinhtrang_send)

                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 255), 2)
                cv2.putText(frame, f"{data}", (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 2)

        self.update_image(frame)

    # Cập nhật hình ảnh từ camera
    def update_image(self, frame):
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb_image.shape
        qt_img = QImage(rgb_image.data, w, h, ch * w, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(qt_img).scaled(self.image_label.size(), Qt.KeepAspectRatio)
        self.image_label.setPixmap(pixmap)

    # Cập nhật thông tin mã QR khi phát hiện
    def update_qr_info(self, qr_code):
        self.qr_label.setText(f"📦 Mã QR: {qr_code}")

    # Cập nhật trạng thái kết nối PLC, Webserver, MySQL
    def update_status(self, plc_connected, web_connected, mysql_connected):
        self.plc_status_label.setText("🔌 PLC: Đã kết nối" if plc_connected else "🔌 PLC: Mất kết nối")
        self.plc_status_led.setStyleSheet("background-color: green;" if plc_connected else "background-color: red;")
        self.webserver_status_label.setText("🔌 Webserver: Đã kết nối" if web_connected else "🔌 Webserver: Mất kết nối")
        self.webserver_status_led.setStyleSheet("background-color: green;" if web_connected else "background-color: red;")
        self.mySQL_status_label.setText("🔌 MySQL: Đã kết nối" if mysql_connected else "🔌 MySQL: Mất kết nối")
        self.mySQL_status_led.setStyleSheet("background-color: green;" if mysql_connected else "background-color: red;")


    # Cập nhật lại IP và URL cho PLC và Webserver
    def update_plc_webserver_address(self):
        global plc_ip_current, webserver_url_current
        new_ip = self.ip_input.text().strip()
        new_url = self.url_input.text().strip()
        if not new_ip or not new_url:
            self.log_to_terminal("❌ IP PLC hoặc URL Webserver không được để trống.")
            return
        plc_ip_current = new_ip
        webserver_url_current = new_url
        self.log_to_terminal(f"🔁 Đã cập nhật PLC IP mới : {new_ip} và URL Webserver mới : {new_url}.")

    # Xử lý sự kiện khi đóng cửa sổ
    def closeEvent(self, event):
        global stop_threads
        stop_threads = True
        self.connection_thread.quit()
        self.connection_thread.wait()

        self.camera_timer.stop()
        if self.capture.isOpened():
            self.capture.release()
        event.accept()

# Chạy ứng dụng
if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = DemoApp()
    window.show()
    sys.exit(app.exec_())
