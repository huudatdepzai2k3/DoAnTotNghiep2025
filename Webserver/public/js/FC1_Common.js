////////////// YÊU CẦU DỮ LIỆU TỪ SERVER- REQUEST DATA //////////////
var myVar = setInterval(myTimer, 100);
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

// Hàm chức năng hiển thị trạng thái symbol
function fn_SymbolStatus(ObjectID, SymName, Tag)
{
    socket.on(Tag, function(data){
        if (data == 0)
        {
            document.getElementById(ObjectID).src = "images/Symbol/" + SymName + "_0.png";
        }
        else if (data == 1)
        {
            document.getElementById(ObjectID).src = "images/Symbol/" + SymName + "_1.png";
        }
        else if (data == 2)
        {
            document.getElementById(ObjectID).src = "images/Symbol/" + SymName + "_2.png";
        }
        else if (data == 3)
        {
            document.getElementById(ObjectID).src = "images/Symbol/" + SymName + "_3.png";
        }
        else 
        {
            document.getElementById(ObjectID).src = "images/Symbol/" + SymName + "_0.png";
        }

    });
}