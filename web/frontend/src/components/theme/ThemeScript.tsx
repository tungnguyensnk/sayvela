/**
 * Đóng dấu giao diện lên thẻ gốc trước khi trang vẽ, nên không bao giờ thấy
 * nền sai trong khoảnh khắc đầu. Chưa từng chọn thì lấy theo hệ điều hành một
 * lần rồi coi đó là lựa chọn hiện tại — giao diện chỉ có sáng và tối, không có
 * trạng thái "theo hệ thống" riêng.
 */
const script = `(function(){try{var t=localStorage.getItem("sayvela-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
