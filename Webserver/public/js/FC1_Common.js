////////////// YÊU CẦU DỮ LIỆU TỪ SERVER- REQUEST DATA //////////////
var myVar = setInterval(myTimer, 1000);
function myTimer() {
    socket.emit("Client-send-data", "Request data client");
}

// Hàm hiển thị dữ liệu lên IO Field
function fn_IOFieldDataShow(tag, IOField, tofix){
    socket.on(tag,function(data){
        if(tofix == 0){
            document.getElementById(IOField).value = data;
        } else{
        document.getElementById(IOField).value = data.toFixed(tofix);
        }
    });
}

// Chương trình con chuyển trang
function fn_ScreenChange(scr_1, scr_2, scr_3, scr_4, scr_5)
{
    document.getElementById(scr_1).style.visibility = 'visible';   // Hiển thị trang được chọn
    document.getElementById(scr_2).style.visibility = 'hidden';    // Ẩn trang 1
    document.getElementById(scr_3).style.visibility = 'hidden';    // Ẩn trang 2
    document.getElementById(scr_4).style.visibility = 'hidden';    // Ẩn trang 3
    document.getElementById(scr_5).style.visibility = 'hidden';    // Ẩn trang 3
}

const socket = io();

////////////// YÊU CẦU DỮ LIỆU TỪ SERVER - REQUEST DATA //////////////
setInterval(() => {
    socket.emit("Client-send-data");
}, 1000);

/////////////////////// NHẬN DỮ LIỆU TỪ SERVER ///////////////////////
socket.on("tag_data", function (data) {
    // Gọi cập nhật biểu tượng cho từng tag
    fn_SymbolStatus("Button_1", "light", data.run);
    fn_SymbolStatus("Button_2", "Button", data.auto);
    fn_SymbolStatus("Conveyor_1", "Conveyor", data.motor);
    fn_SymbolStatus("Conveyor_2", "Conveyor", data.motor);
    fn_SymbolStatus("Conveyor_3", "Conveyor", data.motor);
    fn_SymbolStatus("Motor", "Motor", data.motor);
    fn_SymbolStatus("Sensor_detech", "Sensor", data.sensor_detech);
    fn_SymbolStatus("Sensor_1", "Sensor", data.sensor_1);
    fn_SymbolStatus("Sensor_2", "Sensor", data.sensor_2);
    fn_SymbolStatus("Sensor_3", "Sensor", data.sensor_3);
    fn_SymbolStatus("Sensor_4", "Sensor", data.sensor_4);
    fn_SymbolStatus("Sensor_5", "Sensor", data.sensor_5);
    fn_SymbolStatus("Xilanh_1", "Xilanh", data.cylinder_1);
    fn_SymbolStatus("Xilanh_2", "Xilanh", data.cylinder_2);
    fn_SymbolStatus("Xilanh_3", "Xilanh", data.cylinder_3);
    fn_SymbolStatus("Xilanh_4", "Xilanh", data.cylinder_4);
    fn_SymbolStatus("Xilanh_5", "Xilanh", data.cylinder_5);

    document.getElementById("Button_2").addEventListener("click", function () {
    socket.emit("Client-send-cmd-toggle", data.auto);
    });
});

/////////////////// HIỂN THỊ TRẠNG THÁI SYMBOL THEO TAG ///////////////////
function fn_SymbolStatus(ObjectID, SymName, TagValue) {
    const element = document.getElementById(ObjectID);
    if (!element) return;
    let suffix = "0";  
    if (TagValue === 1) suffix = "1";
    else if (TagValue === 2) suffix = "2";
    else suffix = "0";

    element.src = `images/Symbol/${SymName}_${suffix}.png`;
}

socket.on('Alarm_Show', function(data){
    fn_table_Alarm(data);
});

// Gửi yêu cầu lấy dữ liệu cảnh báo
function fn_Alarm_Show(){
    socket.emit("msg_Alarm_Show");
}

let alarmShowRunning = true;
function fn_Alarm_Show_Loop() {
    if (!alarmShowRunning) return;
    fn_Alarm_Show();
    setTimeout(fn_Alarm_Show_Loop, 1000);
}

function pauseAlarmFor15s() {
    alarmShowRunning = false;

    setTimeout(() => {
        alarmShowRunning = true;
        fn_Alarm_Show_Loop(); 
    }, 15000);
}

// Hiển thị dữ liệu ra bảng HTML
function fn_table_Alarm(data) {
    const tbody = $("#table_Alarm tbody");
    tbody.empty();

    if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
            // Xử lý định dạng date_time nếu có chữ 'T' hoặc 'Z'
            let formattedDateTime = item.date_time;
            if (formattedDateTime.includes("T")) {
                formattedDateTime = formattedDateTime.replace("T", " ");
            }
            if (formattedDateTime.includes("Z")) {
                formattedDateTime = formattedDateTime.replace("Z", "");
            }

            const row = `<tr>
                <td>${formattedDateTime}</td>
                <td>${item.ID}</td>
                <td>${item.Status}</td>
                <td>${item.AlarmName}</td>
            </tr>`;
            tbody.append(row);
        });
    } else {
        tbody.append("<tr><td colspan='4'>Không có cảnh báo</td></tr>");
    }
}

// Tìm kiếm cảnh báo theo thời gian
function fn_Alarm_By_Time()
{
    alarmShowRunning = false;
    var val = [document.getElementById('dtpk_AL_Search_Start').value,
               document.getElementById('dtpk_AL_Search_End').value];
    socket.emit('msg_Alarm_ByTime', val);
    socket.on('Alarm_ByTime', function(data){
        fn_table_Alarm(data); 
    });
    pauseAlarmFor15s();
}