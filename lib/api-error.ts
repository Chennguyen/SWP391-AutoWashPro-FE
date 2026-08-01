/**
 * Lớp ApiError
 *
 * Lớp lỗi tùy chỉnh đại diện cho các thất bại của API, ghi lại mã trạng thái và thông báo lỗi.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Hàm kiểm tra kiểu dữ liệu (Type guard) để xác định xem giá trị có phải là một đối tượng record thông thường hay không.
 *
 * @param value Giá trị cần kiểm tra.
 * @returns Trả về true nếu giá trị là một đối tượng, không phải null và không phải mảng.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Hàm bổ trợ để chuyển đổi các lỗi xác thực phức tạp (như lỗi ModelState của .NET) thành một chuỗi duy nhất.
 *
 * @param errors Trường lỗi từ payload phản hồi của API.
 * @returns Một chuỗi chứa thông tin chi tiết về lỗi, hoặc null nếu đối tượng lỗi không hợp lệ.
 */
function stringifyErrors(errors: unknown): string | null {
  if (Array.isArray(errors)) {
    return errors.map(String).filter(Boolean).join(" ");
  }

  if (!isRecord(errors)) {
    return null;
  }

  return Object.entries(errors)
    .flatMap(([field, messages]) => {
      if (Array.isArray(messages)) {
        return messages.map((message) => `${field}: ${String(message)}`);
      }

      return [`${field}: ${String(messages)}`];
    })
    .filter(Boolean)
    .join(" ");
}

/** Các nhóm message nghiệp vụ đã được đối chiếu với exception hiện có trong source BE. */
type ErrorTranslationRule = Readonly<{
  patterns: readonly string[];
  translation: string;
}>;

const ERROR_TRANSLATION_RULES: readonly ErrorTranslationRule[] = [
  // Xác thực, tài khoản và hồ sơ
  {
    patterns: ["invalid email or password", "username or password is incorrect", "invalid credentials"],
    translation: "Email hoặc mật khẩu không đúng.",
  },
  {
    patterns: ["account is locked", "account locked", "account blocked"],
    translation: "Tài khoản đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.",
  },
  {
    patterns: ["account is inactive", "account is not active"],
    translation: "Tài khoản đang ngừng hoạt động. Vui lòng liên hệ hỗ trợ.",
  },
  {
    patterns: ["you are not logged in or your session has expired"],
    translation: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  },
  {
    patterns: ["only active and verified customer accounts"],
    translation: "Tài khoản chưa được kích hoạt hoặc xác minh.",
  },
  {
    patterns: ["only customer accounts can access this resource", "you are not customer"],
    translation: "Chỉ tài khoản khách hàng mới có thể sử dụng chức năng này.",
  },
  {
    patterns: ["user email is not available"],
    translation: "Tài khoản chưa có địa chỉ email hợp lệ.",
  },
  {
    patterns: ["email does not exist"],
    translation: "Email chưa được đăng ký trong hệ thống.",
  },
  {
    patterns: ["receiver user not found"],
    translation: "Không tìm thấy người nhận thông báo.",
  },
  {
    patterns: ["user does not exist", "account does not exist", "user not found"],
    translation: "Không tìm thấy tài khoản.",
  },
  {
    patterns: ["customer profile not found"],
    translation: "Không tìm thấy hồ sơ khách hàng.",
  },
  {
    patterns: ["customer not found"],
    translation: "Không tìm thấy khách hàng.",
  },
  {
    patterns: ["invalid email format"],
    translation: "Định dạng email không hợp lệ.",
  },
  {
    patterns: ["invalid phone number format"],
    translation: "Định dạng số điện thoại không hợp lệ.",
  },
  {
    patterns: [
      "user exist with mail",
      "email is already taken",
      "email already exists",
      "email already in use",
      "email is already used",
    ],
    translation: "Email này đã được đăng ký. Vui lòng dùng email khác.",
  },
  {
    patterns: [
      "user exist with phone",
      "phone number already",
      "phone already",
      "phone number is already in use",
      "phone number is already used",
    ],
    translation: "Số điện thoại này đã được đăng ký. Vui lòng dùng số điện thoại khác.",
  },
  {
    patterns: ["date of birth cannot be in the future", "date of birth must not be in the future"],
    translation: "Ngày sinh không được lớn hơn ngày hiện tại.",
  },
  {
    patterns: ["date of birth can only be set once", "date of birth can only be updated by an administrator"],
    translation: "Ngày sinh chỉ được cập nhật một lần. Vui lòng liên hệ quản trị viên nếu cần điều chỉnh.",
  },
  {
    patterns: ["at least 3 face images are required"],
    translation: "Cần tải lên ít nhất 3 ảnh khuôn mặt.",
  },
  {
    patterns: ["at least one verification field must be provided"],
    translation: "Vui lòng cung cấp ít nhất một thông tin xác minh.",
  },
  {
    patterns: ["only rejected users can resubmit verification"],
    translation: "Chỉ tài khoản bị từ chối xác minh mới có thể gửi lại hồ sơ.",
  },
  {
    patterns: ["only customer accounts can be verified"],
    translation: "Chỉ tài khoản khách hàng mới có thể được xác minh.",
  },
  {
    patterns: ["only pending or rejected users can be verified"],
    translation: "Chỉ tài khoản đang chờ hoặc đã bị từ chối mới có thể được xác minh.",
  },
  {
    patterns: ["only pending users can be verified"],
    translation: "Chỉ tài khoản đang chờ xác minh mới có thể được duyệt.",
  },
  {
    patterns: ["user is not verified"],
    translation: "Tài khoản chưa được xác minh.",
  },
  {
    patterns: ["cannot lock or deactivate yourself"],
    translation: "Bạn không thể tự khóa hoặc ngừng hoạt động tài khoản của mình vì hệ thống phải duy trì ít nhất một quản trị viên đang hoạt động.",
  },
  {
    patterns: ["status must be one of: active, locked, inactive"],
    translation: "Trạng thái phải là Active, Locked hoặc Inactive.",
  },
  {
    patterns: ["status is required"],
    translation: "Vui lòng chọn trạng thái.",
  },

  // Mật khẩu, OTP và token khôi phục
  {
    patterns: ["current password is incorrect", "incorrect password", "current password does not match"],
    translation: "Mật khẩu hiện tại không đúng.",
  },
  {
    patterns: ["new password and confirm password do not match", "confirm password does not match", "passwords do not match"],
    translation: "Mật khẩu xác nhận không khớp.",
  },
  {
    patterns: ["new password must be different from current password"],
    translation: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  },
  {
    patterns: ["current password is required"],
    translation: "Vui lòng nhập mật khẩu hiện tại.",
  },
  {
    patterns: ["new password is required"],
    translation: "Vui lòng nhập mật khẩu mới.",
  },
  {
    patterns: ["confirm password is required"],
    translation: "Vui lòng nhập lại mật khẩu mới.",
  },
  {
    patterns: ["password is required"],
    translation: "Vui lòng nhập mật khẩu.",
  },
  {
    patterns: ["password must be at least 8 characters long", "new password must be at least 8 characters long"],
    translation: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.",
  },
  {
    patterns: ["passwords must have at least one non alphanumeric character"],
    translation: "Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (ví dụ: @, #, $, ...).",
  },
  {
    patterns: ["passwords must have at least one lowercase"],
    translation: "Mật khẩu mới phải chứa ít nhất một chữ cái thường.",
  },
  {
    patterns: ["passwords must have at least one uppercase"],
    translation: "Mật khẩu mới phải chứa ít nhất một chữ cái viết hoa.",
  },
  {
    patterns: ["passwords must have at least one digit", "must have at least one digit"],
    translation: "Mật khẩu mới phải chứa ít nhất một chữ số (0-9).",
  },
  {
    patterns: ["passwords must be at least", "password is too short"],
    translation: "Mật khẩu mới quá ngắn. Vui lòng nhập mật khẩu dài hơn.",
  },
  {
    patterns: ["invalid or expired otp"],
    translation: "Mã OTP không hợp lệ hoặc đã hết hạn.",
  },
  {
    patterns: ["otp request limit exceeded"],
    translation: "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
  },
  {
    patterns: ["invalid or expired reset password token", "invalid token purpose", "invalid token subject"],
    translation: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
  },

  // Đặt lịch, thanh toán và check-in
  {
    patterns: ["cannot book past time"],
    translation: "Không thể đặt lịch vào thời gian đã qua. Vui lòng chọn thời gian khác.",
  },
  {
    patterns: ["bookingdate must match starttime date"],
    translation: "Ngày đặt lịch phải trùng với ngày của giờ bắt đầu.",
  },
  {
    patterns: ["starttime must be aligned to exact minute boundaries"],
    translation: "Giờ bắt đầu phải được chọn theo phút chính xác.",
  },
  {
    patterns: ["starttime must be within working hours"],
    translation: "Giờ đặt lịch phải nằm trong giờ hoạt động của chi nhánh.",
  },
  {
    patterns: ["starttime must match a configured booking slot"],
    translation: "Giờ bắt đầu không khớp với khung giờ đặt lịch hiện có.",
  },
  {
    patterns: ["booking time is too close to another booking"],
    translation: "Thời gian đặt lịch quá gần một lịch hẹn khác. Vui lòng kiểm tra cảnh báo trước khi tiếp tục.",
  },
  {
    patterns: ["slot already booked", "time slot is already booked", "slot unavailable"],
    translation: "Khung giờ này đã được đặt trước. Vui lòng chọn khung giờ khác.",
  },
  {
    patterns: ["booking not found, does not belong to the current customer, or is no longer confirmed"],
    translation: "Không tìm thấy lịch hẹn, lịch không thuộc tài khoản hiện tại hoặc không còn ở trạng thái đã xác nhận.",
  },
  {
    patterns: ["booking not found"],
    translation: "Không tìm thấy lịch hẹn.",
  },
  {
    patterns: ["only check_in or in_progress bookings can be completed manually"],
    translation: "Chỉ lịch đã check-in hoặc đang thực hiện mới có thể hoàn tất thủ công.",
  },
  {
    patterns: ["only confirmed bookings can be checked in"],
    translation: "Chỉ lịch đã xác nhận mới có thể check-in.",
  },
  {
    patterns: ["check-in is not available before the booking start time"],
    translation: "Chưa đến giờ bắt đầu lịch hẹn nên chưa thể check-in.",
  },
  {
    patterns: ["check-in time has expired"],
    translation: "Đã quá thời hạn check-in cho lịch hẹn này.",
  },
  {
    patterns: ["booking is already cancelled", "booking has already been cancelled"],
    translation: "Lịch hẹn đã được hủy trước đó.",
  },
  {
    patterns: ["completed booking cannot be cancelled"],
    translation: "Không thể hủy lịch hẹn đã hoàn thành.",
  },
  {
    patterns: ["only confirmed bookings can be cancelled"],
    translation: "Chỉ lịch đã xác nhận mới có thể hủy.",
  },
  {
    patterns: ["this booking cannot be cancelled"],
    translation: "Lịch hẹn này không thể hủy ở trạng thái hiện tại.",
  },
  {
    patterns: ["booking must be cancelled at least"],
    translation: "Đã quá thời hạn cho phép hủy lịch trước giờ bắt đầu.",
  },
  {
    patterns: ["not enough balance", "wallet balance is insufficient"],
    translation: "Số dư ví không đủ để thực hiện giao dịch.",
  },
  {
    patterns: ["not enough points"],
    translation: "Bạn không có đủ điểm để thực hiện thao tác này.",
  },
  {
    patterns: ["your rank is not enough for this booked"],
    translation: "Hạng thành viên hiện tại chưa đủ điều kiện để đặt lịch này.",
  },
  {
    patterns: ["wallet not exists", "wallet not found"],
    translation: "Không tìm thấy ví của khách hàng.",
  },

  // Voucher
  {
    patterns: ["voucher does not belong to the current customer"],
    translation: "Voucher không thuộc tài khoản khách hàng hiện tại.",
  },
  {
    patterns: ["voucher is reserved by another booking"],
    translation: "Voucher đang được giữ cho một lịch hẹn khác.",
  },
  {
    patterns: ["booking voucher is no longer reserved"],
    translation: "Voucher không còn được giữ cho lịch hẹn này. Vui lòng chọn lại voucher.",
  },
  {
    patterns: ["booking voucher not found"],
    translation: "Không tìm thấy voucher đã gắn với lịch hẹn.",
  },
  {
    patterns: ["voucher already used"],
    translation: "Voucher đã được sử dụng.",
  },
  {
    patterns: ["voucher expired"],
    translation: "Voucher đã hết hạn.",
  },
  {
    patterns: ["voucher has no discount value"],
    translation: "Voucher không có giá trị giảm giá hợp lệ.",
  },
  {
    patterns: ["voucher is no longer available", "voucher is not available"],
    translation: "Voucher hiện không còn khả dụng.",
  },
  {
    patterns: ["welcome and no-first-booking vouchers can only be used"],
    translation: "Voucher chào mừng hoặc chưa từng đặt lịch chỉ áp dụng cho lần đặt lịch đầu tiên.",
  },
  {
    patterns: ["invalid voucher", "voucher is not valid", "voucher not found"],
    translation: "Không tìm thấy voucher hoặc voucher không hợp lệ.",
  },

  // Xe
  {
    patterns: ["license plate already exists"],
    translation: "Biển số xe đã tồn tại trong hệ thống.",
  },
  {
    patterns: ["license plate is required"],
    translation: "Vui lòng nhập biển số xe.",
  },
  {
    patterns: ["vehicle images must contain from 1 to 3 files"],
    translation: "Vui lòng tải lên từ 1 đến 3 ảnh xe.",
  },
  {
    patterns: ["at least 3 vehicle images are required"],
    translation: "Cần tải lên ít nhất 3 ảnh xe.",
  },
  {
    patterns: ["vehicle image upload failed"],
    translation: "Tải ảnh xe thất bại. Vui lòng thử lại.",
  },
  {
    patterns: ["file is empty or null"],
    translation: "Tệp tải lên đang trống.",
  },
  {
    patterns: ["file is not a valid image"],
    translation: "Tệp tải lên không phải là ảnh hợp lệ.",
  },
  {
    patterns: ["cannot delete vehicle with active bookings"],
    translation: "Không thể xóa xe đang có lịch hẹn hoạt động.",
  },
  {
    patterns: ["failed to save vehicle to the database"],
    translation: "Không thể lưu thông tin xe. Vui lòng thử lại.",
  },
  {
    patterns: ["failed to update vehicle"],
    translation: "Không thể cập nhật thông tin xe. Vui lòng thử lại.",
  },
  {
    patterns: ["failed to delete vehicle"],
    translation: "Không thể xóa xe. Vui lòng thử lại.",
  },
  {
    patterns: ["vehicle type not found"],
    translation: "Không tìm thấy loại xe.",
  },
  {
    patterns: ["vehicle not found"],
    translation: "Không tìm thấy xe.",
  },

  // Chi nhánh, báo cáo và tham số chung
  {
    patterns: ["branch name already exists", "branch already exists"],
    translation: "Tên chi nhánh đã tồn tại.",
  },
  {
    patterns: ["branch not found"],
    translation: "Không tìm thấy chi nhánh.",
  },
  {
    patterns: ["branch name is required", "branch name cannot be empty"],
    translation: "Vui lòng nhập tên chi nhánh.",
  },
  {
    patterns: ["branch address is required", "branch address cannot be empty"],
    translation: "Vui lòng nhập địa chỉ chi nhánh.",
  },
  {
    patterns: ["branchid is invalid"],
    translation: "Mã chi nhánh không hợp lệ.",
  },
  {
    patterns: ["branchid is required"],
    translation: "Vui lòng chọn chi nhánh.",
  },
  {
    patterns: ["fromdate must be less than or equal to todate", "fromdate cannot be later than todate"],
    translation: "Ngày bắt đầu không được sau ngày kết thúc.",
  },
  {
    patterns: ["fromdate and todate are required"],
    translation: "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.",
  },
  {
    patterns: ["date is required"],
    translation: "Vui lòng chọn ngày.",
  },
  {
    patterns: ["page and pagesize must be greater than 0", "pageindex and pagesize must be greater than 0", "pagesize and pageindex must be greater than 0"],
    translation: "Số trang và số mục mỗi trang phải lớn hơn 0.",
  },
  {
    patterns: ["page and pagesize are required"],
    translation: "Vui lòng cung cấp số trang và số mục mỗi trang.",
  },
  {
    patterns: ["page size must be greater than 0", "pagesize must be greater than 0"],
    translation: "Số mục mỗi trang phải lớn hơn 0.",
  },
  {
    patterns: ["page must be greater than 0", "pageindex must be greater than 0"],
    translation: "Số trang phải lớn hơn 0.",
  },
  {
    patterns: ["at least one field is required for update"],
    translation: "Vui lòng cung cấp ít nhất một trường cần cập nhật.",
  },
  {
    patterns: ["request body is required", "request is required"],
    translation: "Dữ liệu yêu cầu không được để trống.",
  },
  {
    patterns: ["correction reason is required"],
    translation: "Vui lòng nhập lý do điều chỉnh.",
  },
  {
    patterns: ["reason is required"],
    translation: "Vui lòng nhập lý do.",
  },

  // Hạng thành viên, khuyến mãi và phần thưởng
  {
    patterns: ["please select at least one tier"],
    translation: "Vui lòng chọn ít nhất một hạng thành viên.",
  },
  {
    patterns: ["one or more selected tiers are invalid or have been deleted"],
    translation: "Một hoặc nhiều hạng đã chọn không hợp lệ hoặc đã bị xóa.",
  },
  {
    patterns: ["tier already exists"],
    translation: "Hạng thành viên đã tồn tại.",
  },
  {
    patterns: ["tier not found"],
    translation: "Không tìm thấy hạng thành viên.",
  },
  {
    patterns: ["cannot change the minimum required washes because customers are already assigned"],
    translation: "Không thể đổi số lượt rửa tối thiểu vì đã có khách hàng thuộc hạng này.",
  },
  {
    patterns: ["required washes must be greater than"],
    translation: "Số lượt rửa yêu cầu phải lớn hơn hạng liền trước.",
  },
  {
    patterns: ["required washes must be less than"],
    translation: "Số lượt rửa yêu cầu phải nhỏ hơn hạng liền sau.",
  },
  {
    patterns: ["cannot delete this tier because customers are currently assigned"],
    translation: "Không thể xóa hạng đang có khách hàng. Hãy chuyển khách hàng sang hạng khác trước.",
  },
  {
    patterns: ["cannot delete this tier because active rewards or promotions are using it"],
    translation: "Không thể xóa hạng đang được phần thưởng hoặc khuyến mãi hoạt động sử dụng.",
  },
  {
    patterns: ["promotion already exists"],
    translation: "Khuyến mãi đã tồn tại.",
  },
  {
    patterns: ["promotion not found"],
    translation: "Không tìm thấy khuyến mãi.",
  },
  {
    patterns: ["cannot delete active promotion"],
    translation: "Không thể xóa khuyến mãi đang hoạt động.",
  },
  {
    patterns: ["discount value must be greater than 0", "discountvalue must be greater than 0"],
    translation: "Giá trị giảm phải lớn hơn 0.",
  },
  {
    patterns: ["percentage discount must be less than 100"],
    translation: "Phần trăm giảm phải nhỏ hơn 100.",
  },
  {
    patterns: ["percentage discount cannot exceed 100", "percentage discountvalue cannot exceed 100"],
    translation: "Phần trăm giảm không được vượt quá 100.",
  },
  {
    patterns: ["reward already exists"],
    translation: "Phần thưởng đã tồn tại.",
  },
  {
    patterns: ["reward is inactive"],
    translation: "Phần thưởng hiện không hoạt động.",
  },
  {
    patterns: ["reward out of stock"],
    translation: "Phần thưởng đã hết số lượng.",
  },
  {
    patterns: ["your tier cannot redeem this reward"],
    translation: "Hạng thành viên hiện tại không đủ điều kiện đổi phần thưởng này.",
  },
  {
    patterns: ["reward not found"],
    translation: "Không tìm thấy phần thưởng.",
  },
  {
    patterns: ["points required must be greater than 0"],
    translation: "Số điểm yêu cầu phải lớn hơn 0.",
  },
  {
    patterns: ["quantity available cannot be negative"],
    translation: "Số lượng khả dụng không được âm.",
  },
  {
    patterns: ["valid days must be greater than 0"],
    translation: "Số ngày hiệu lực phải lớn hơn 0.",
  },

  // Cấu hình voucher cá nhân hóa
  {
    patterns: ["personalized voucher rule not found"],
    translation: "Không tìm thấy quy tắc voucher cá nhân hóa.",
  },
  {
    patterns: ["an active personalized voucher rule already exists for trigger"],
    translation: "Đã có một quy tắc voucher cá nhân hóa đang hoạt động cho loại kích hoạt này.",
  },
  {
    patterns: ["vouchername is required"],
    translation: "Vui lòng nhập tên voucher.",
  },
  {
    patterns: ["vouchername cannot exceed 200 characters"],
    translation: "Tên voucher không được vượt quá 200 ký tự.",
  },
  {
    patterns: ["vouchervaliditydays must be greater than 0"],
    translation: "Số ngày hiệu lực của voucher phải lớn hơn 0.",
  },
  {
    patterns: ["thresholddays must be greater than 0 for this trigger"],
    translation: "Số ngày ngưỡng phải lớn hơn 0 đối với loại kích hoạt này.",
  },
  {
    patterns: ["thresholddays is not supported for this trigger"],
    translation: "Loại kích hoạt này không hỗ trợ cấu hình số ngày ngưỡng.",
  },
  {
    patterns: ["inactive customer rules must send an email"],
    translation: "Quy tắc dành cho khách hàng không hoạt động phải bật gửi email.",
  },
  {
    patterns: ["notification title and content templates are required"],
    translation: "Vui lòng nhập mẫu tiêu đề và nội dung thông báo.",
  },
  {
    patterns: ["email subject and body templates are required"],
    translation: "Vui lòng nhập mẫu tiêu đề và nội dung email.",
  },
  {
    patterns: ["calltoactionurl must be an absolute http or https url"],
    translation: "Đường dẫn kêu gọi hành động phải là URL HTTP hoặc HTTPS đầy đủ.",
  },
  {
    patterns: ["inactive customer rules require a calltoactionurl"],
    translation: "Quy tắc khách hàng không hoạt động cần có đường dẫn kêu gọi hành động.",
  },
  {
    patterns: ["inactive email template must contain"],
    translation: "Mẫu email khách hàng không hoạt động đang thiếu biến nội dung bắt buộc.",
  },
  {
    patterns: ["customerid and voucherruleid are required"],
    translation: "Vui lòng cung cấp khách hàng và quy tắc voucher.",
  },
  {
    patterns: ["cyclekey is required and cannot exceed 200 characters"],
    translation: "Khóa chu kỳ là bắt buộc và không được vượt quá 200 ký tự.",
  },
  {
    patterns: ["triggerreference cannot exceed 200 characters"],
    translation: "Tham chiếu kích hoạt không được vượt quá 200 ký tự.",
  },
  {
    patterns: ["customer email is not configured"],
    translation: "Khách hàng chưa cấu hình địa chỉ email.",
  },

  // Chat, thông báo và giao dịch
  {
    patterns: ["message is required"],
    translation: "Vui lòng nhập nội dung tin nhắn.",
  },
  {
    patterns: ["conversation not found"],
    translation: "Không tìm thấy cuộc trò chuyện.",
  },
  {
    patterns: ["transaction not found"],
    translation: "Không tìm thấy giao dịch.",
  },
];

function findErrorTranslation(message: string): string | null {
  const raw = message.toLowerCase().replace(/\s+/g, " ").trim();

  for (const rule of ERROR_TRANSLATION_RULES) {
    if (rule.patterns.some((pattern) => raw.includes(pattern))) {
      return rule.translation;
    }
  }

  return null;
}

export function translateErrorMessage(message: string): string {
  return findErrorTranslation(message) ?? message;
}

/** Thu thập các message có thể có trong ApiResponse và .NET Problem Details. */
function appendStringCandidates(candidates: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    candidates.push(value.trim());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendStringCandidates(candidates, item));
    return;
  }

  if (isRecord(value)) {
    Object.values(value).forEach((item) => appendStringCandidates(candidates, item));
  }
}

function getErrorMessageCandidates(body: unknown): string[] {
  if (typeof body === "string" && body.trim()) {
    return [body.trim()];
  }

  if (!isRecord(body)) {
    return [];
  }

  const candidates: string[] = [];
  appendStringCandidates(candidates, body.message);
  appendStringCandidates(candidates, body.error);
  appendStringCandidates(candidates, body.detail);
  appendStringCandidates(candidates, body.errors);

  const errors = stringifyErrors(body.errors);
  if (errors) {
    candidates.push(errors);
  }

  appendStringCandidates(candidates, body.title);
  return [...new Set(candidates)];
}

const GENERIC_SERVER_ERROR = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";

/**
 * Chuẩn hóa payload lỗi dùng chung cho cả fetch và Axios.
 * Với lỗi 5xx, chỉ các message nghiệp vụ đã được đối chiếu từ source BE mới được hiển thị;
 * các chi tiết kỹ thuật không xác định tiếp tục bị che để tránh rò rỉ thông tin nội bộ.
 */
export function getApiErrorMessage(body: unknown, status: number): string {
  const candidates = getErrorMessageCandidates(body);
  const knownTranslation = candidates
    .map(findErrorTranslation)
    .find((translation): translation is string => translation !== null);

  if (knownTranslation) {
    return knownTranslation;
  }

  const primaryMessage = candidates[0] ?? `Lỗi ${status}`;
  const normalizedPrimaryMessage = primaryMessage.toLowerCase();

  if (
    status >= 500 ||
    normalizedPrimaryMessage.includes("unexpected error") ||
    normalizedPrimaryMessage.includes("internal server error")
  ) {
    return GENERIC_SERVER_ERROR;
  }

  return primaryMessage;
}

/**
 * Hàm tiện ích để xử lý các phản hồi HTTP từ các yêu cầu fetch.
 * Phân tích cú pháp phản hồi JSON, kiểm tra xem phản hồi có thành công hay không, và ném lỗi ApiError nếu thất bại.
 *
 * @template T Kiểu dữ liệu trả về mong muốn khi thành công.
 * @param res Đối tượng phản hồi Fetch API.
 * @returns Nội dung phản hồi đã được xử lý.
 * @throws ApiError nếu trạng thái yêu cầu HTTP không thành công.
 */
export async function handleApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message = getApiErrorMessage(body, res.status);

    if (
      message.includes("Only active and verified customer accounts") ||
      message.includes("Tài khoản chưa được kích hoạt hoặc xác minh")
    ) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("is_unverified", "true");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    }

    throw new ApiError(message, res.status);
  }
  if (
    typeof window !== "undefined" &&
    res.url &&
    res.url.includes("/api/v1/me") &&
    !res.url.includes("/my-status")
  ) {
    if (window.localStorage.getItem("is_unverified") === "true") {
      window.localStorage.removeItem("is_unverified");
      window.dispatchEvent(new Event("autowash-auth"));
    }
  }

  return body as T;
}

/**
 * Trả về URL gốc của API.
 * Sử dụng biến môi trường để cấu hình.
 *
 * @returns URL cơ sở của API.
 */
export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return base;
}
