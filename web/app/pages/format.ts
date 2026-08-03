// money formats optional product prices consistently across C-end and admin UI.
export function money(price?: number | null) {
  if (price === null || price === undefined) {
    return "未设置价格";
  }
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(price);
}
