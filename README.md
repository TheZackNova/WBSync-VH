# Bộ đồng bộ Thế giới thư (Worldbook Synchronizer) v1.5.0

Đây là một plugin quản lý và đồng bộ hóa Thế giới thư mạnh mẽ được thiết kế cho SillyTavern, nhằm cung cấp một quy trình làm việc hiệu quả và trực quan hơn so với trình chỉnh sửa mặc định.

## 🆕 Nhật ký cập nhật (Changelog)

### v1.5.0
* **Thêm mới**: Tính năng tự động cập nhật, cung cấp lối vào cập nhật trong menu chính, tự động nhắc nhở khi cài đặt lần đầu hoặc có phiên bản mới.
* **Tối ưu hóa**: Tối ưu hóa logic hiển thị của "Script nhân vật" và "Regex cục bộ", hiện chỉ hiển thị các tùy chọn liên quan khi vào thẻ nhân vật.
* **Thêm mới**: Thêm chức năng tải xuống trong Quản lý Thế giới thư/Quản lý Script trợ lý tửu quán/Quản lý Script Regex.

### v1.4.0
* **Thêm mới**: Ba mô-đun quản lý lớn gồm "Quản lý Thế giới thư", "Quản lý Script trợ lý tửu quán", "Quản lý Script Regex", sử dụng bố cục dạng thẻ, hỗ trợ thu gọn/mở rộng.
* **Thêm mới**: Trong "Quản lý Thế giới thư", danh sách mục hiển thị thông tin chi tiết như "Vị trí chèn", "Thứ tự", "Xác suất kích hoạt".
* **Thêm mới**: Bảng chỉnh sửa "Quản lý Script Regex" tích hợp tính năng xem trước render thời gian thực, có thể xem trực tiếp hiệu ứng render HTML trong plugin.
* **Thêm mới**: Thêm tùy chọn trạng thái thu gọn mặc định cho "Quản lý Thế giới thư", "Quản lý Script trợ lý tửu quán", "Quản lý Script Regex" trong cài đặt plugin.
* **Tối ưu hóa**: Nút làm mới của các mô-đun quản lý được chuyển thống nhất lên thanh tiêu đề, thao tác thuận tiện hơn.
* **Tối ưu hóa**: Các nút "Lưu", "Hủy" của bảng chỉnh sửa được chuyển lên thanh tiêu đề, giao diện gọn gàng hơn.
* **Tối ưu hóa**: Tái cấu trúc mã nguồn sang kiến trúc mô-đun (draggable.js, worldbook-manager.js, script-manager.js, regex-manager.js), nâng cao khả năng bảo trì.
* **Tối ưu hóa**: Sửa logic hiển thị của "Regex cục bộ" và "Script nhân vật", chỉ hiển thị khi chọn thẻ nhân vật.
* **Tối ưu hóa**: Sửa lỗi trạng thái thu gọn bất thường của bảng chỉnh sửa, tự động mở rộng mỗi khi mở.
* **Tối ưu hóa**: Sửa logic hiển thị đèn xanh dương/đèn xanh lá của mục Thế giới thư, phán đoán chính xác chế độ thường trực/kích hoạt có điều kiện.

### v1.3.0
* **Tái cấu trúc**: Quy chuẩn hóa quản lý kiểu mô-đun, chia tách logic cốt lõi thành nhiều mô-đun chức năng, tăng cường tính gắn kết và khả năng bảo trì của mã nguồn.
* **Tối ưu hóa**: Áp dụng cơ chế bộ nhớ đệm truy vấn DOM và render DOM hàng loạt, tối ưu hóa đáng kể vấn đề giật lag, nâng cao hiệu suất.
* **Thêm mới**: Thêm chức năng thu gọn cho các thẻ được trích xuất tạo ra trong "Bộ đồng bộ Thế giới thư", "Bộ đồng bộ Front-end" và "Bộ đồng bộ Script".
* **Thêm mới**: Thêm tùy chọn "Mặc định thu gọn nội dung khi trích xuất thẻ" trong "Cài đặt plugin", cho phép người dùng tùy chỉnh trạng thái hiển thị mặc định của thẻ.
* **Tối ưu hóa**: Điều chỉnh khoảng cách ô nhập "Từ khóa" trong thẻ "Bộ đồng bộ Thế giới thư", cải thiện bố cục thị giác.

### v1.2.0
* **Sửa lỗi**: Loại bỏ kiểu giả lập `:hover` của thanh cuộn trong CSS, giải quyết vấn đề báo lỗi chữ đỏ trong console khi core của tửu quán `dynamic-styles.js` cố gắng tạo quy tắc `:focus-visible`.
* **Tối ưu hóa**: Nâng cao tính tương thích và độ ổn định của plugin trong phiên bản SillyTavern mới nhất.

## ✨ Chức năng cốt lõi

### 1. ⚡ Bộ đồng bộ Thế giới thư
* **Trích xuất thông minh**: Thông qua các thẻ bắt đầu và kết thúc tùy chỉnh (như `<wb>` và `</wb>`), tự động trích xuất các thiết lập Thế giới thư do AI tạo ra từ lịch sử trò chuyện mới nhất.
* **Chỉnh sửa dạng thẻ**: Nội dung trích xuất sẽ tự động tạo thành các thẻ độc lập, bạn có thể sửa đổi tên mục, từ khóa, nội dung một cách trực quan.
* **Cài đặt nâng cao**: Hỗ trợ sửa đổi các thuộc tính nâng cao như chế độ kích hoạt (thường trực/kích hoạt có điều kiện), vị trí chèn (trước/sau định nghĩa nhân vật, chèn sâu...), độ sâu chèn, cài đặt đệ quy, v.v.
* **Thao tác hàng loạt**: Cung cấp chức năng thiết lập hàng loạt, thống nhất thuộc tính của tất cả các mục được trích xuất bằng một cú nhấp chuột, và hỗ trợ đồng bộ một chạm vào Thế giới thư mục tiêu.

### 2. 📚 Quản lý Thế giới thư
* **Bố cục dạng thẻ**: Danh sách Thế giới thư và danh sách mục sử dụng bố cục dạng thẻ, hỗ trợ thu gọn/mở rộng, hiển thị thông tin rõ ràng hơn.
* **Thông tin chi tiết**: Danh sách mục hiển thị thông tin chi tiết như "Vị trí chèn", "Thứ tự", "Xác suất kích hoạt", nhìn là hiểu ngay.
* **Thao tác nhanh**: Các nút thao tác như tạo mới, chọn tất cả/bỏ chọn, xóa được đặt trên thanh tiêu đề của thẻ, thao tác thuận tiện hơn.
* **Chọn kích hoạt**: Nhanh chóng tích chọn hoặc bỏ chọn các Thế giới thư cần kích hoạt toàn cục trong một bảng điều khiển độc lập.
* **Lưu và tải phương án**: Lưu các tổ hợp Thế giới thư thường dùng thành phương án, tải một chạm, thuận tiện chuyển đổi giữa các ngữ cảnh khác nhau.
* **Tạo mới Thế giới thư**: Nhanh chóng tạo Thế giới thư trống mới.
* **Sửa đổi tên**: Đổi tên Thế giới thư một cách an toàn, plugin sẽ tự động xử lý việc di chuyển nội dung.
* **Sao chép Thế giới thư**: Nhân bản Thế giới thư hiện có bằng một cú nhấp chuột, thuận tiện cho bạn thực hiện thử nghiệm nhánh hoặc sao lưu trong các cuộc trò chuyện khác nhau.
* **Xóa Thế giới thư và mục**: Cung cấp danh sách trực quan, hỗ trợ tích chọn hàng loạt và xóa vĩnh viễn các Thế giới thư hoặc các mục cụ thể không cần thiết. Các mục được hiển thị phân loại theo "Đèn xanh dương (thường trực)" và "Đèn xanh lá (kích hoạt có điều kiện)".
* **Di chuyển mục**: Dễ dàng sao chép/di chuyển hàng loạt các mục cụ thể từ một Thế giới thư này sang một Thế giới thư khác, thuận tiện cho việc hợp nhất và tổ chức lại các thiết lập thế giới quan của bạn.

### 3. 🤖 Quản lý Script trợ lý tửu quán
* **Bố cục dạng thẻ**: Hiển thị phân loại Script toàn cục, Script cài sẵn, Script nhân vật, hỗ trợ thu gọn/mở rộng.
* **Chỉnh sửa nhanh**: Nhấp vào script để sửa đổi tên script, nội dung, ghi chú tác giả, v.v. trong bảng chỉnh sửa.
* **Bật/Tắt**: Chuyển đổi trạng thái kích hoạt script bằng một cú nhấp chuột.
* **Xóa script**: Hỗ trợ xóa các script không cần thiết.

### 4. 📋 Quản lý Script Regex
* **Bố cục dạng thẻ**: Hiển thị phân loại Regex toàn cục, Regex cài sẵn, Regex cục bộ, hỗ trợ thu gọn/mở rộng.
* **Chỉnh sửa đầy đủ**: Hỗ trợ chỉnh sửa tất cả các thuộc tính của script regex, bao gồm regex tìm kiếm, văn bản thay thế, phạm vi tác động, cài đặt độ sâu, v.v.
* **Render thời gian thực**: Bảng chỉnh sửa tích hợp chức năng xem trước render, có thể xem trực tiếp hiệu ứng render HTML trong plugin.
* **Bật/Tắt**: Chuyển đổi trạng thái kích hoạt regex bằng một cú nhấp chuột.
* **Xóa regex**: Hỗ trợ xóa các script regex không cần thiết.

### 5. 🛠️ Công cụ Script và Regex
* **Tạo/Nhập script regex**: Trực tiếp tạo các script regex phức tạp trong plugin hoặc nhập từ tệp. Hỗ trợ cấu hình tất cả các tùy chọn script regex gốc, và có thể chọn nhập vào toàn cục, cài sẵn hoặc nhân vật.
* **Tạo/Nhập script trợ lý tửu quán**: Trực tiếp viết hoặc nhập script trợ lý tửu quán, và có thể chọn nhập vào kho script toàn cục, cài sẵn hoặc nhân vật.
* **Bộ đồng bộ Front-end**: Trích xuất mã front-end HTML/CSS/JS do AI tạo ra thông qua các thẻ tùy chỉnh, và có thể xem trước hiệu ứng render thời gian thực trong môi trường sandbox an toàn.
* **Bộ đồng bộ Script**: Trích xuất mã JS/TS từ lịch sử trò chuyện thông qua các thẻ tùy chỉnh và nhanh chóng nhập làm script trợ lý tửu quán.

### 6. ⚙️ Cài đặt plugin
* **Quản lý lối vào**: Bạn có thể tự do lựa chọn phương thức vào plugin theo thói quen sử dụng của mình, bao gồm:
    * **Bóng nổi**: Hiển thị một bóng nổi có thể kéo được ở góc dưới bên phải trang, nhấp để mở plugin.
    * **Menu đũa thần**: Hiển thị lối vào "Bộ đồng bộ Thế giới thư" trong menu đũa thần ở góc dưới bên trái.
    * **Thanh phản hồi nhanh**: Hiển thị một biểu tượng lối vào trong thanh phản hồi nhanh gần ô nhập liệu.
* **Bảo vệ thông minh**: Để ngăn bạn vô tình đóng tất cả các lối vào dẫn đến không thể truy cập plugin, hệ thống sẽ bắt buộc yêu cầu giữ lại ít nhất một lối vào ở trạng thái mở.
* **Cài đặt thu gọn mô-đun quản lý**: Có thể thiết lập trạng thái thu gọn mặc định của các thẻ "Quản lý Thế giới thư", "Quản lý Script trợ lý tửu quán", "Quản lý Script Regex".

## 🚀 Hướng dẫn sử dụng

1.  **Mở plugin**:
    * **Bóng nổi**: Nhấp vào bóng nổi <i class="fa-solid fa-book-atlas"></i> ở góc dưới bên phải trang.
    * **Menu đũa thần**: Nhấp vào biểu tượng đũa thần ở góc dưới bên trái trang, chọn "Bộ đồng bộ Thế giới thư" trong menu hiện ra.
    * **Thanh phản hồi nhanh**: Nhấp vào biểu tượng <i class="fa-solid fa-book-atlas"></i> gần ô nhập liệu.

2.  **Menu chính**:
    * **Tải Thế giới thư toàn cục**: Quản lý và tải các phương án Thế giới thư được kích hoạt toàn cục.
    * **Quản lý Thế giới thư**: Cung cấp một loạt các chức năng chỉnh sửa mạnh mẽ như tạo mới, đổi tên, sao chép, sửa đổi, xóa, di chuyển các mục Thế giới thư.
    * **Quản lý Script trợ lý tửu quán**: Quản lý script toàn cục, cài sẵn, nhân vật, hỗ trợ chỉnh sửa nhanh và xóa.
    * **Quản lý Script Regex**: Quản lý regex toàn cục, cài sẵn, cục bộ, hỗ trợ chỉnh sửa đầy đủ và xem trước render thời gian thực.
    * **Chức năng plugin**:
        * **Bộ đồng bộ Thế giới thư**: Chức năng cốt lõi, trích xuất nội dung từ trò chuyện và đồng bộ thành mục Thế giới thư.
        * **Bộ đồng bộ Front-end**: Trích xuất và xem trước mã front-end.
        * **Bộ đồng bộ Script**: Trích xuất và nhập script trợ lý tửu quán.
        * **Cài đặt plugin**: Quản lý phương thức hiển thị lối vào plugin và cài đặt thu gọn mô-đun quản lý.

3.  **Ghi nhớ lâu dài**:
    * Plugin sẽ tự động lưu lại chế độ xem giao diện khi bạn đóng lần trước, thuận tiện cho bạn tiếp tục các thao tác trước đó khi mở lại lần sau.
    * Tất cả các cài đặt, ví dụ như các thẻ được sử dụng khi trích xuất, Thế giới thư được chọn, trạng thái hiển thị của lối vào, trạng thái thu gọn của mô-đun quản lý, v.v., đều sẽ được tự động lưu trong bộ nhớ cục bộ của trình duyệt, không cần cấu hình lại.

Hy vọng bản hướng dẫn chi tiết này sẽ giúp bạn sử dụng Bộ đồng bộ Thế giới thư tốt hơn!
