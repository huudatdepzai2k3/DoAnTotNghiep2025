CREATE TABLE qr_sorting_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sorted_time DATETIME,
    qr_code VARCHAR(255),
    address VARCHAR(255),
    tinhtrang VARCHAR(255)
);